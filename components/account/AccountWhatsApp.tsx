'use client';
import {useState} from 'react';
import {createClient} from '@/lib/supabase/browser';
import {normalizeWhatsAppBR,displayWhatsApp} from '@/lib/whatsapp';
export function AccountWhatsApp({initial,marketing}:{initial:string|null,marketing:boolean}){
 const [phone,setPhone]=useState(initial?displayWhatsApp(initial):'');
 const [consent,setConsent]=useState(marketing);
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState('');
 const [fail,setFail]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;
  setMsg('');setFail(false);
  const formatted=normalizeWhatsAppBR(phone);
  if(phone.trim()&&!formatted){setFail(true);setMsg('Informe um WhatsApp válido com DDD.');return;}
  setBusy(true);
  try{
   const sb=createClient();
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user)throw Error('session');
   const {error}=await sb.from('profiles').update({
    whatsapp_e164:formatted,whatsapp_marketing_opt_in:Boolean(formatted&&consent),
    whatsapp_opt_in_at:formatted&&consent?new Date().toISOString():null,
    updated_at:new Date().toISOString()
   }).eq('id',user.id);
   if(error)throw Error('save');
   setMsg('WhatsApp atualizado na sua conta.');
  }catch{setFail(true);setMsg('Não foi possível salvar. Entre novamente ou verifique sua conexão.');}
  finally{setBusy(false);}
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
