'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

export function ResetPasswordForm() {
  const [ok, setOk] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({data}) => setOk(Boolean(data.user)));
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!ok || pending) return; setError('');
    if (password.length < 10 || password !== confirmation) { setError('Use pelo menos 10 caracteres e confirme a mesma senha.'); return; }
    setPending(true);
    try {
      const supabase = createClient();
      const {error: updateError} = await supabase.auth.updateUser({password});
      if (updateError) setError('Não foi possível atualizar a senha. Solicite outro link.');
      else { await supabase.auth.signOut(); setDone(true); }
    } catch { setError('Erro de conexão. Tente novamente.'); }
    finally { setPending(false); }
  }
  if (done) return <div className="auth-form"><p className="auth-alert success">Senha atualizada. Entre novamente para continuar.</p><Link className="auth-submit auth-button-link" href="/entrar">Entrar</Link></div>;
  if (!ok) return <div className="auth-form"><p className="auth-alert error">Para redefinir sua senha, abra o link recebido por e-mail. Se expirou, solicite outro.</p><Link className="auth-secondary" href="/recuperar-senha">Solicitar novo link</Link></div>;
  return <form onSubmit={submit} className="auth-form"><label>Nova senha <input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={e=>setPassword(e.target.value)} /></label><label>Confirme a senha <input type="password" autoComplete="new-password" minLength={10} required value={confirmation} onChange={e=>setConfirmation(e.target.value)} /></label>{error && <p className="auth-alert error" role="alert">{error}</p>}<button className="auth-submit" disabled={pending}>{pending?'Atualizando...':'Salvar nova senha →'}</button></form>;
}
