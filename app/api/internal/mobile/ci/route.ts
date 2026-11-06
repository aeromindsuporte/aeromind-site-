import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyGitHubOidc } from '@/lib/mobile/github-ci-oidc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BUCKET = 'aeromind-apk-releases';
const MIN_CODE = 55; // v52 publicada; v53/54 reservadas ao teste/recuperacao.

type Metadata = {
  version_code: number;
  version_name: string;
  sha256: string;
  size_bytes: number;
  release_notes: string;
};

function respond(code: number, data: Record<string, unknown>) {
  return NextResponse.json(data, {
    status: code,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function parseMetadata(x: unknown): Metadata | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const m = x as Record<string, unknown>;
  if (!Number.isSafeInteger(m.version_code) || (m.version_code as number) < MIN_CODE) return null;
  if (typeof m.version_name !== 'string' || m.version_name.length < 1 ||
      m.version_name.length > 40 || /[\r\n<>]/.test(m.version_name)) return null;
  if (typeof m.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(m.sha256)) return null;
  if (!Number.isSafeInteger(m.size_bytes) || (m.size_bytes as number) < 20_000 ||
      (m.size_bytes as number) > 15_000_000) return null;
  if (typeof m.release_notes !== 'string' || m.release_notes.length > 1800) return null;
  return m as Metadata;
}

function pathFor(m: Metadata) {
  return 'releases/aeromind-v' + m.version_code + '-' + m.sha256.slice(0, 16) + '.apk';
}

function matchesRelease(row: Record<string, unknown>, m: Metadata) {
  return row.version_code === m.version_code &&
    row.version_name === m.version_name && row.sha256 === m.sha256 &&
    Number(row.size_bytes) === m.size_bytes && row.storage_path === pathFor(m);
}

/** Somente servidor: calcula SHA-256 dos bytes realmente recebidos no Storage. */
async function verifyStorageObject(
  supabase: SupabaseClient,
  metadata: Metadata
): Promise<boolean> {
  const { data, error } = await supabase.storage.from(BUCKET).download(pathFor(metadata));
  if (error || !data) return false;
  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.length !== metadata.size_bytes) return false;
  return createHash('sha256').update(bytes).digest('hex') === metadata.sha256;
}

export async function POST(request: NextRequest) {
  // Assinatura RSA do OIDC, audience, repo/id, workflow, branch e evento.
  const claims = await verifyGitHubOidc(request.headers.get('authorization'));
  if (!claims) return respond(401, { error: 'Identidade do pipeline não validada.' });

  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return respond(415, { error: 'JSON obrigatório.' });
  }
  const raw = await request.text();
  if (raw.length > 6000) return respond(413, { error: 'Solicitação inválida.' });
  let payload: unknown;
  try { payload = JSON.parse(raw); }
  catch { return respond(400, { error: 'JSON inválido.' }); }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return respond(400, { error: 'Solicitação inválida.' });
  }
  const body = payload as Record<string, unknown>;
  const action = body.action;
  const m = parseMetadata(body);
  if (!m || (action !== 'prepare' && action !== 'finalize')) {
    return respond(400, { error: 'Metadados de versão inválidos.' });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !serviceKey || !publishableKey) {
    return respond(503, { error: 'Ambiente de publicação não configurado.' });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    const { data: published, error: publishedError } = await admin.from('aeromind_app_releases')
      .select('version_code').eq('status', 'published')
      .order('version_code', { ascending: false }).limit(1).maybeSingle();
    if (publishedError) return respond(503, { error: 'Falha ao consultar versão atual.' });
    if (published && m.version_code <= published.version_code) {
      return respond(409, { error: 'O código da versão deve superar a publicação atual.' });
    }

    const { data: existing, error: existingError } = await admin.from('aeromind_app_releases')
      .select('id,version_code,version_name,sha256,size_bytes,storage_path,status,release_notes')
      .eq('version_code', m.version_code).maybeSingle();
    if (existingError) return respond(503, { error: 'Falha ao consultar rascunho.' });
    if (existing && (existing.status !== 'draft' || !matchesRelease(existing, m) ||
        existing.release_notes !== m.release_notes)) {
      return respond(409, { error: 'Esse código já pertence a outra versão.' });
    }

    if (action === 'prepare') {
      if (existing) return respond(409, { error: 'Rascunho já preparado. Não sobrescreva o APK.' });
      const { data, error } = await admin.storage.from(BUCKET)
        .createSignedUploadUrl(pathFor(m), { upsert: false });
      if (error || !data?.token) return respond(503, { error: 'Falha ao preparar upload privado.' });
      return respond(200, {
        path: pathFor(m),
        upload_token: data.token,
        supabase_url: supabaseUrl,
        publishable_key: publishableKey, // A chave e publica; service_role nunca sai do servidor.
        bucket: BUCKET,
      });
    }

    // Mesmo com CI autenticada, o servidor confere os bytes antes de registrar/publicar.
    if (!(await verifyStorageObject(admin, m))) {
      return respond(422, { error: 'APK ausente ou divergente de tamanho e SHA-256.' });
    }

    if (action === 'finalize') {
      if (!existing) {
        const { error } = await admin.from('aeromind_app_releases').insert({
          version_code: m.version_code,
          version_name: m.version_name,
          sha256: m.sha256,
          size_bytes: m.size_bytes,
          release_notes: m.release_notes,
          storage_path: pathFor(m),
          status: 'draft',
        });
        if (error) return respond(503, { error: 'Falha ao registrar rascunho privado.' });
      }
      return respond(200, { status: 'draft', version_code: m.version_code, path: pathFor(m) });
    }


  } catch {
    return respond(500, { error: 'Falha interna no pipeline de versões.' });
  }
}
