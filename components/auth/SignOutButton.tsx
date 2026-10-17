'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    try { await createClient().auth.signOut(); router.replace('/entrar'); router.refresh(); }
    finally { setPending(false); }
  }
  return <button type="button" className="auth-secondary auth-logout" disabled={pending} onClick={logout}>{pending ? 'Saindo...' : 'Sair da conta →'}</button>;
}
