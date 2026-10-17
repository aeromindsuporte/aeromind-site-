import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Dedicated exact redirect URL, so Supabase can allowlist it without query params.
// Recovery tokens must exchange for a session before showing the password form.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(new URL('/redefinir-senha', url.origin));
      response.headers.set('Cache-Control', 'no-store');
      return response;
    }
  }

  return NextResponse.redirect(new URL('/recuperar-senha?erro=link', url.origin));
}
