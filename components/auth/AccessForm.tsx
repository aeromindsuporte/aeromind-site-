'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';

type Mode = 'login' | 'signup';

function friendlyError(message: string) {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha inválidos.';
  if (/email not confirmed/i.test(message)) return 'Confirme seu e-mail antes de entrar.';
  if (/already registered/i.test(message)) return 'Não foi possível concluir o cadastro. Verifique seu e-mail ou tente entrar.';
  if (/rate limit|too many requests/i.test(message)) return 'Muitas tentativas. Aguarde alguns minutos.';
  if (/password/i.test(message)) return 'Confira os requisitos da senha.';
  return 'Não foi possível concluir a operação. Tente novamente.';
}

export function AccessForm({ mode, next = '/minha-conta' }: { mode: Mode; next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/minha-conta';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setErrorMessage(''); setNotice('');
    if (mode === 'signup' && password !== confirm) { setErrorMessage('As senhas não coincidem.'); return; }
    if (password.length < 10) { setErrorMessage('A senha precisa de pelo menos 10 caracteres.'); return; }
    setPending(true);
    try {
      const supabase = createClient();
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) { setErrorMessage(friendlyError(error.message)); return; }
        router.replace(safeNext);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: window.location.origin + '/auth/callback', data: { full_name: name.trim().slice(0,120) } }
        });
        if (error) { setErrorMessage(friendlyError(error.message)); return; }
        if (data.session) { router.replace('/minha-conta'); router.refresh(); }
        else setNotice('Confira sua caixa de entrada para confirmar o cadastro. Se o e-mail não chegar, consulte o spam.');
      }
    } catch { setErrorMessage('Falha de conexão. Tente novamente.'); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="auth-form">
    {mode === 'signup' && <label>Nome <input type="text" autoComplete="name" maxLength={120} required placeholder="Como podemos chamar você?" value={name} onChange={e => setName(e.target.value)} /></label>}
    <label>E-mail <span className="auth-input"><span aria-hidden="true">✉</span><input type="email" name="email" autoComplete="email" required maxLength={320} placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} /></span></label>
    <label>Senha <span className="auth-input"><span aria-hidden="true">♙</span><input type={visible ? 'text' : 'password'} name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={10} placeholder={mode === 'signup' ? 'Mínimo de 10 caracteres' : 'Digite sua senha'} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" className="auth-see" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button></span></label>
    {mode === 'signup' && <label>Confirme a senha <input type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={10} required placeholder="Repita sua senha" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>}
    {mode === 'login' && <div className="auth-options"><span>Sessão segura neste navegador</span><Link href="/recuperar-senha">Esqueci minha senha?</Link></div>}
    {errorMessage && <p className="auth-alert error" role="alert">{errorMessage}</p>}
    {notice && <p className="auth-alert success" role="status">{notice}</p>}
    <button type="submit" className="auth-submit" disabled={pending || Boolean(notice)}>{pending ? 'Aguarde...' : mode === 'login' ? 'Entrar →' : 'Criar conta →'}</button>
    <div className="auth-or"><span>ou</span></div>
    <Link href={mode === 'login' ? '/cadastro' : '/entrar'} className="auth-secondary">{mode === 'login' ? 'Criar conta gratuita →' : 'Já tenho uma conta →'}</Link>
    <p className="auth-legal">Ao se cadastrar, você concorda em consultar nossos <Link href="/termos">Termos</Link> e nossa <Link href="/privacidade">Política de Privacidade</Link>. A criação da conta não ativa uma licença.</p>
  </form>;
}
