'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/browser';
import {normalizeWhatsAppBR,displayWhatsApp} from '@/lib/whatsapp';

export function AccountWhatsApp({
 initial,marketing,loadError=false
}:{initial:string|null;marketing:boolean;loadError?:boolean}){
 const router=useRouter();
 const [savedNumber,setSavedNumber]=useState(initial);
 const [phone,setPhone]=useState(initial?displayWhatsApp(initial):'');
 const [consent,setConsent]=useState(marketing);
 const [editing,setEditing]=useState(!initial);
 const [busy,setBusy]=useState(false);
 const [msg,setMsg]=useState('');
 const [fail,setFail]=useState(false);

 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy||loadError)return;
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
   }).eq('id',user.id).select('whatsapp_e164,whatsapp_marketing_opt_in').maybeSingle();
   if(error){
    // Apenas código técnico: nunca registrar telefone nem dados pessoais.
    console.error('account_whatsapp_update',error.code);
    setFail(true);
    setMsg(error.code==='23514'
     ?'O número não passou na validação. Confira o DDD e tente novamente.'
     :error.code==='42501'
      ?'Sua conta está sem permissão para atualizar o perfil. Atualize a página e tente novamente.'
      :'O salvamento falhou. Tente novamente ou entre em contato com o suporte.');
    return;
   }
   if(!data||data.whatsapp_e164!==formatted){
    setFail(true);setMsg('O banco não confirmou seu WhatsApp. Confira o cadastro e tente novamente.');return;
   }
   // Não mostrar êxito até confirmar que o valor está persistido e pode ser lido.
   const {data:verified,error:readError}=await sb.from('profiles')
    .select('whatsapp_e164,whatsapp_marketing_opt_in')
    .eq('id',user.id).maybeSingle();
   if(readError||!verified||verified.whatsapp_e164!==formatted){
    setFail(true);setMsg('Não foi possível confirmar o WhatsApp salvo. Atualize a página e confira os dados.');return;
   }
   setSavedNumber(verified.whatsapp_e164);
   setPhone(verified.whatsapp_e164?displayWhatsApp(verified.whatsapp_e164):'');
   setConsent(verified.whatsapp_marketing_opt_in===true);
   setEditing(!verified.whatsapp_e164);
   setMsg(verified.whatsapp_e164?'WhatsApp salvo e confirmado na sua conta.':'WhatsApp removido da sua conta.');
   router.refresh();
  }catch{
   setFail(true);setMsg('A conexão foi interrompida. Verifique sua internet e tente novamente.');
  }finally{setBusy(false);}
 }

 if(loadError)return <p role="alert" className="account-whatsapp-error">
  Não foi possível consultar seu WhatsApp no banco. Atualize a página antes de alterar o cadastro.
 </p>;

 if(savedNumber&&!editing)return <div className="account-whatsapp-view">
  <div className="account-whatsapp-saved" role="status">
   <strong>✓ WhatsApp cadastrado</strong>
   <span>{displayWhatsApp(savedNumber)}</span>
   <small>{consent?'Autorizou novidades e ofertas.':'Sem autorização para ofertas.'} Número não verificado por código.</small>
  </div>
  {msg&&!fail&&<p role="status" className="account-whatsapp-ok">{msg}</p>}
  <button type="button" className="auth-secondary account-whatsapp-edit" onClick={()=>{
   setEditing(true);setMsg('');setFail(false);
  }}>Alterar WhatsApp</button>
 </div>;

 return <form className="account-whatsapp-form" onSubmit={submit}>
  {!savedNumber&&<p className="account-note">Você ainda não tem WhatsApp salvo neste perfil. Cadastre uma única vez: ele ficará associado à sua conta nos próximos acessos.</p>}
  <label>WhatsApp com DDD<input type="tel" inputMode="tel" autoComplete="tel"
   placeholder="(11) 99999-9999" value={phone} onChange={e=>setPhone(e.target.value)} maxLength={24}/></label>
  <label className="account-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>
   <span>Aceito receber novidades e ofertas no WhatsApp (opcional).</span></label>
  <p className="account-note">Você pode editar ou retirar o número. Ele não está verificado por código.</p>
  {msg&&<p role={fail?'alert':'status'} className={fail?'account-whatsapp-error':'account-whatsapp-ok'}>{msg}</p>}
  <div className="account-whatsapp-buttons">
   <button type="submit" className="auth-submit" disabled={busy}>{busy?'Salvando…':'Salvar WhatsApp'}</button>
   {savedNumber&&<button type="button" className="auth-secondary" disabled={busy} onClick={()=>{
    setPhone(displayWhatsApp(savedNumber));setEditing(false);setMsg('');setFail(false);
   }}>Cancelar</button>}
  </div>
 </form>;
}
