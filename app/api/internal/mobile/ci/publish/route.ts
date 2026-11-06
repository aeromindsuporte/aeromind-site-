import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyGitHubOidc } from '@/lib/mobile/github-ci-oidc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function respond(status: number, message: Record<string, unknown>) {
  return NextResponse.json(message, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  });
}

/**
 * Aprovacao de release SOMENTE por execucao manual do workflow
 * na branch main. Nao aceita eventos push nem sessao de usuario comum.
 */
export async function POST(req: NextRequest) {
  const claims = await verifyGitHubOidc(req.headers.get('authorization'));
  if (!claims || claims.event_name !== 'workflow_dispatch') {
    return respond(401, { error: 'Somente aprovação manual autenticada do GitHub.' });
  }
  if (!req.headers.get('content-type')?.startsWith('application/json')) {
    return respond(415, { error: 'JSON obrigatório.' });
  }
  const raw = await req.text();
  if (raw.length > 512) return respond(413, { error: 'Solicitação inválida.' });
  let payload: unknown;
  try { payload = JSON.parse(raw); }
  catch { return respond(400, { error: 'JSON inválido.' }); }
  const code = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).version_code : null;
  if (!Number.isSafeInteger(code) || (code as number) < 57) {
    return respond(400, { error: 'Código de versão inválido.' });
  }
  const versionCode = code as number;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return respond(503, { error: 'Publicação não configurada.' });
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  try {
    const { data: release, error } = await admin.from('aeromind_app_releases')
      .select('id,version_code,status,storage_path,sha256,size_bytes')
      .eq('version_code', versionCode).maybeSingle();
    if (error || !release || release.status !== 'draft') {
      return respond(409, { error: 'Não existe rascunho privado validado para esta versão.' });
    }
    const expectedPath = 'releases/aeromind-v' + versionCode + '-' +
      release.sha256.slice(0, 16) + '.apk';
    if (release.storage_path !== expectedPath ||
        !/^[a-f0-9]{64}$/.test(release.sha256) ||
        !Number.isSafeInteger(Number(release.size_bytes)) ||
        release.size_bytes > 15_000_000 || release.size_bytes < 20_000) {
      return respond(422, { error: 'Metadados da versão inconsistentes.' });
    }
    const { data: file, error: storageError } = await admin.storage
      .from('aeromind-apk-releases').download(expectedPath);
    if (storageError || !file) return respond(422, { error: 'APK privado indisponível.' });
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length !== release.size_bytes ||
        createHash('sha256').update(bytes).digest('hex') !== release.sha256) {
      return respond(422, { error: 'Arquivo não corresponde ao rascunho aprovado.' });
    }
    // RPC restrita a service_role: troca de versao publica em uma transacao.
    const { data: result, error: publishError } = await admin.rpc(
      'aeromind_ci_publish_release',
      { p_version_code: versionCode, p_sha256: release.sha256 }
    );
    if (publishError || !result) return respond(503, { error: 'Publicação transacional recusada.' });
    return respond(200, { status: 'published', version_code: versionCode, result });
  } catch {
    return respond(500, { error: 'Falha ao publicar a versão.' });
  }
}
