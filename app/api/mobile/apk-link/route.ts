import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { bearerToken, installationHash, publishedApk, betaApk, type PublishedApk, type BetaApk } from '@/lib/mobile/apk-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function reply(status: number, data: Record<string, unknown>) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * Ponte Android -> Storage privado. So aceita JWT de usuario e o hash da
 * instalacao, confere a autorizacao REAL no RPC e oferece URL com 60s de vida.
 * O download publico utiliza RLS; beta privado utiliza RPC de aparelho/conta
 * administrativa, seguida de URL temporaria assinada no servidor. A service_role
 * nunca e exposta ao app nem a clientes.
 */
export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request.headers.get('authorization'));
    if (!token) return reply(401, { error: 'Entre no AeroMind para baixar a atualização.' });
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return reply(415, { error: 'Envie a solicitação em JSON.' });
    }
    const raw = await request.text();
    if (raw.length > 512) return reply(413, { error: 'Solicitação muito grande.' });
    let payload: unknown;
    try { payload = JSON.parse(raw); }
    catch { return reply(400, { error: 'JSON inválido.' }); }
    const installHash = installationHash(payload);
    if (!installHash) return reply(400, { error: 'Identificação da instalação inválida.' });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return reply(503, { error: 'Serviço de atualizações não configurado.' });

    const supabase = createClient(url, key, {
      global: { headers: { Authorization: 'Bearer ' + token } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) return reply(401, { error: 'Sessão inválida ou expirada.' });

    // Servidor, não o app, confirma licença E vínculo do aparelho.
    const { data: verdict, error: permissionError } = await supabase.rpc('aeromind_android_access', {
      p_install_hash: installHash,
    });
    if (permissionError) return reply(503, { error: 'Não foi possível validar o aparelho.' });
    if (!verdict || typeof verdict !== 'object' || verdict.allowed !== true || verdict.reason !== 'ok') {
      return reply(403, { error: 'Este aparelho não está autorizado para atualizações.' });
    }
    const { data: active, error: licenseError } = await supabase.rpc('aeromind_has_active_license');
    if (licenseError || active !== true) return reply(403, { error: 'Licença ativa necessária.' });

    // O RPC beta nunca entrega rascunhos a clientes comuns: exige staff,
    // licenca, device ativo, concessao limitada a UM aparelho e rollout ativo.
    const { data: betaRelease, error: betaError } = await supabase.rpc(
      'aeromind_android_beta_download_release', { p_install_hash: installHash }
    );
    if (betaError) return reply(503, { error: 'Não foi possível validar o canal de atualização.' });

    let release: PublishedApk | BetaApk;
    if (betaRelease !== null) {
      if (!betaApk(betaRelease)) return reply(503, { error: 'Versão beta inválida.' });
      release = betaRelease;
    } else {
      const { data: publishedRelease, error: releaseError } = await supabase
        .from('aeromind_app_releases')
        .select('id,version_code,version_name,storage_path,sha256,size_bytes,status')
        .eq('status', 'published')
        .order('version_code', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (releaseError) return reply(503, { error: 'Falha ao consultar a versão publicada.' });
      if (!publishedApk(publishedRelease)) return reply(404, { error: 'Nenhum APK válido publicado.' });
      release = publishedRelease;
    }

    // Service role fica exclusivamente na Vercel; uso no beta so DEPOIS
    // da autorizacao pessoal/dispositivo conferida pelo RPC autenticado.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (release.status === 'draft' && !serviceKey) {
      return reply(503, { error: 'Canal beta temporariamente indisponível.' });
    }
    const storageClient = release.status === 'draft'
      ? createClient(url, serviceKey!, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
      : supabase;
    const { data: signed, error: storageError } = await storageClient.storage
      .from('aeromind-apk-releases')
      .createSignedUrl(release.storage_path, 60, { download: 'AeroMind-v' + release.version_code + '.apk' });
    if (storageError || !signed?.signedUrl) return reply(503, { error: 'Download temporariamente indisponível.' });

    // O Android só aceita HTTPS no host Supabase original e rota /object/sign.
    const signedUrl = new URL(signed.signedUrl, url);
    if (signedUrl.protocol !== 'https:' || signedUrl.host !== new URL(url).host ||
        !signedUrl.pathname.startsWith('/storage/v1/object/sign/aeromind-apk-releases/')) {
      return reply(503, { error: 'A origem do arquivo não pôde ser verificada.' });
    }

    const { error: trackError } = await supabase.from('aeromind_download_events')
      .insert({ user_id: auth.user.id, release_id: release.id });
    if (trackError) return reply(503, { error: 'Não foi possível registrar o pedido de atualização.' });

    return reply(200, {
      url: signedUrl.toString(),
      version: release.version_name,
      sha256: release.sha256,
      size_bytes: release.size_bytes,
    });
  } catch {
    return reply(500, { error: 'Falha temporária ao preparar atualização.' });
  }
}
