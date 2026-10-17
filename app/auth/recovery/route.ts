import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Links PKCE normais e links token_hash funcionam nesta mesma rota.
// token_hash dispensa os cookies do navegador em que a solicitação começou.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const supabase = await createClient();

  let success = false;
  if (tokenHash && tokenHash.length <= 512) {
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    });
    success = !error;
  } else if (code && code.length <= 2048) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    success = !error;
  }

  const destination = success ? '/redefinir-senha' : '/recuperar-senha?erro=link';
  const response = NextResponse.redirect(new URL(destination, url.origin));
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
