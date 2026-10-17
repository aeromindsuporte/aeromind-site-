'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

export function RecoveryForm() {
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (pending) return; setPending(true); setMessage('');
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + '/auth/callback?next=%2Fredefinir-senha'
      });
      if (error && /rate limit|too many requests/i.test(error.message)) setMessage('Muitas solicitações. Tente novamente mais tarde.');
      else if (error) setMessage('Não foi possível enviar agora. Tente mais tarde.');
      else setDone(true);
    } catch { setMessage('Não foi possível conectar. Tente novamente.'); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="auth-form">
    <p className="auth-form-description">Informe o e-mail do cadastro. Enviaremos instruções se houver uma conta associada.</p>
    <label>E-mail <input type="email" required maxLength={320} autoComplete="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} /></label>
    {done && <p className="auth-alert success" role="status">Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.</p>}
    {message && <p className="auth-alert error" role="alert">{message}</p>}
    <button className="auth-submit" disabled={pending || done}>{pending ? 'Enviando...' : 'Enviar instruções →'}</button>
    <Link className="auth-secondary" href="/entrar">Voltar ao login</Link>
  </form>;
}
