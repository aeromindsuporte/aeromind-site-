'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {normalizeWhatsAppBR} from '@/lib/whatsapp';
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
  const [whatsapp,setWhatsapp]=useState('');
  const [marketing,setMarketing]=useState(false);
  const [whatsapp,setWhatsapp] = useState('');
  const [marketingConsent,setMarketingConsent] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [rememberEmail,setRememberEmail] = useState(true);
  useEffect(()=>{if(mode!=='login')return;try{const saved=window.localStorage.getItem('aeromind:remember-email');if(saved){setEmail(saved);setRememberEmail(true);}}catch{/* optional autofill */}},[mode]);
  const safeNext = next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : '/minha-conta';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setErrorMessage(''); setNotice('');
    const number=mode==='signup'?normalizeWhatsAppBR(whatsapp):null;
    if(mode==='signup'&&!number){setErrorMessage('Informe um WhatsApp válido com DDD brasileiro.');return;}
    if (mode === 'signup' && password !== confirm) { setErrorMessage('As senhas não coincidem.'); return; }
    if (password.length < 10) { setErrorMessage('A senha precisa de pelo menos 10 caracteres.'); return; }
    const digits=whatsapp.replace(/\D/g,'');
    if(mode==='signup'&&!/^[1-9][0-9]{9,10}$/.test(digits)){setErrorMessage('Informe um WhatsApp válido com DDD.');return;}
    setPending(true);
    try {
      const supabase = createClient();
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) { setErrorMessage(friendlyError(error.message)); return; }
        try {if(rememberEmail) window.localStorage.setItem('aeromind:remember-email',email.trim());else window.localStorage.removeItem('aeromind:remember-email');}catch{/* optional autofill */}
        setPassword('');
        router.replace(safeNext);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: window.location.origin + '/auth/callback', data: { full_name: name.trim().slice(0,120),whatsapp_e164:number,whatsapp_marketing_opt_in:marketingConsent } }
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
    {mode==='signup'&&<>
      <label>WhatsApp com DDD <input type="tel" required autoComplete="tel" inputMode="tel" placeholder="(11) 99999-9999" maxLength={24} value={whatsapp} onChange={e=>setWhatsapp(e.target.value)}/></label>
      <label className="auth-checkbox-row"><input type="checkbox" checked={marketingConsent} onChange={e=>setMarketingConsent(e.target.checked)}/>
       <span>Autorizo receber novidades e ofertas pelo WhatsApp (opcional; posso desativar depois).</span></label>
      <p className="auth-legal">O número será usado para identificação e atendimento. Não está verificado até futura confirmação por código.</p>
    </>}
    {mode==='signup'&&<><label>WhatsApp com DDD <input type="tel" inputMode="tel" autoComplete="tel-national" maxLength={16} required placeholder="(11) 99999-9999" value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} /></label><label className="auth-legal"><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/> Aceito receber novidades e ofertas pelo WhatsApp (opcional).</label></>}
    <label>E-mail <span className="auth-input"><span aria-hidden="true">✉</span><input type="email" name="email" autoComplete="email" required maxLength={320} placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} /></span></label>
    <label>Senha <span className="auth-input"><span aria-hidden="true">♙</span><input type={visible ? 'text' : 'password'} name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={10} placeholder={mode === 'signup' ? 'Mínimo de 10 caracteres' : 'Digite sua senha'} value={password} onChange={e => setPassword(e.target.value)} /><button type="button" className="auth-see" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVisible(!visible)}>{visible ? 'Ocultar' : 'Mostrar'}</button></span></label>
    {mode === 'signup' && <label>Confirme a senha <input type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={10} required placeholder="Repita sua senha" value={confirm} onChange={e => setConfirm(e.target.value)} /></label>}
    {mode === 'login' && <><div className="auth-options"><label style={{display:'inline-flex',gap:9,alignItems:'center',cursor:'pointer'}}><input type="checkbox" checked={rememberEmail} onChange={e=>setRememberEmail(e.target.checked)} style={{width:18,height:18,accentColor:'#c437ee'}}/> Lembrar meu e-mail</label><Link href="/recuperar-senha">Esqueci minha senha?</Link></div><p className="auth-legal">Para lembrar a senha com segurança, aceite a opção de salvar senha oferecida pelo seu navegador. Não armazenamos sua senha no site.</p></>}
    {errorMessage && <p className="auth-alert error" role="alert">{errorMessage}</p>}
    {notice && <p className="auth-alert success" role="status">{notice}</p>}
    <button type="submit" className="auth-submit" disabled={pending || Boolean(notice)}>{pending ? 'Aguarde...' : mode === 'login' ? 'Entrar →' : 'Criar conta →'}</button>
    <div className="auth-or"><span>ou</span></div>
    <Link href={mode === 'login' ? '/cadastro' : '/entrar'} className="auth-secondary">{mode === 'login' ? 'Criar conta gratuita →' : 'Já tenho uma conta →'}</Link>
    <p className="auth-legal">Ao se cadastrar, você concorda em consultar nossos <Link href="/termos">Termos</Link> e nossa <Link href="/privacidade">Política de Privacidade</Link>. A criação da conta não ativa uma licença.</p>
  </form>;
}
