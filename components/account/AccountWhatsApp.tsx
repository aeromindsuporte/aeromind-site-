'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/browser';
import {normalizeWhatsAppBR,displayWhatsApp} from '@/lib/whatsapp';
export function AccountWhatsApp({initial,marketing}:{initial:string|null,marketing:boolean}){
 const router=useRouter();
 const [phone,setPhone]=useState(initial?displayWhatsApp(initial):'');
 const [consent,setConsent]=useState(marketing);
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState('');
 const [fail,setFail]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;
  setMsg('');setFail(false);
  const formatted=normalizeWhatsAppBR(phone);
  if(phone.trim()&&!formatted){
   setFail(true);setMsg('Informe um WhatsApp brasileiro válido com DDD.');return;
  }
  setBusy(true);
  try{
   const sb=createClient();
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user){
    setFail(true);setMsg('Sua sessão expirou. Entre novamente para atualizar seu WhatsApp.');return;
   }
   const {data,error}=await sb.from('profiles').update({
    whatsapp_e164:formatted,
    whatsapp_marketing_opt_in:Boolean(formatted&&consent),
    whatsapp_opt_in_at:formatted&&consent?new Date().toISOString():null,
    updated_at:new Date().toISOString()
   }).eq('id',user.id).select('id').maybeSingle();
   if(error){
    // Registra somente o código técnico, nunca o WhatsApp ou dados pessoais.
    console.error('account_whatsapp_update',error.code);
    setFail(true);
    setMsg(error.code==='23514'
      ?'O número não passou na validação. Confira o DDD e tente novamente.'
      :error.code==='42501'
       ?'Sua conta está sem permissão para atualizar o perfil. Atualize a página e tente novamente.'
       :'O salvamento falhou. Tente novamente; se persistir, entre em contato com o suporte.');
    return;
   }
   if(!data){
    setFail(true);setMsg('O cadastro não foi encontrado para esta sessão. Entre novamente e tente salvar.');return;
   }
   setMsg('WhatsApp salvo com sucesso na sua conta.');
   router.refresh();
  }catch{
   setFail(true);setMsg('A conexão foi interrompida. Verifique sua internet e tente novamente.');
  }finally{setBusy(false);}
 }
 return <form className="account-whatsapp-form" onSubmit={submit}>
  <label>WhatsApp com DDD<input type="tel" inputMode="tel" autoComplete="tel"
   placeholder="(11) 99999-9999" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={24}/></label>
  <label className="account-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
   <span>Aceito receber novidades e ofertas no WhatsApp (opcional).</span></label>
  <p className="account-note">Você pode editar ou retirar o número. Ele não está verificado por código.</p>
  {msg&&<p role={fail?'alert':'status'} className={fail?'account-whatsapp-error':'account-whatsapp-ok'}>{msg}</p>}
  <button type="submit" className="auth-submit" disabled={busy}>{busy?'Salvando…':'Salvar WhatsApp'}</button>
 </form>;
}
