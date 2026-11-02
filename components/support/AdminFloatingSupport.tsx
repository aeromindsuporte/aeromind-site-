'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {usePathname} from 'next/navigation';
import {createClient} from '@/lib/supabase/browser';
import {SupportAdminChat} from './SupportAdminChat';
import './admin-floating-support.css';

/** This widget is mounted only inside admin pages protected by requireAdmin. */
export function AdminFloatingSupport(){
 const sb=useMemo(()=>createClient(),[]);
 const pathname=usePathname();
 const [open,setOpen]=useState(false);
 const [unread,setUnread]=useState(0);
 const [ready,setReady]=useState(false);
 const refreshUnread=useCallback(async()=>{
  const {data,error}=await sb.rpc('aeromind_support_chat_unread_count');
  if(error)return;
  setUnread(typeof data==='number'&&Number.isFinite(data)?Math.max(0,data):0);
  setReady(true);
 },[sb]);
 useEffect(()=>{
  let mounted=true;
  const poll=async()=>{
   const {data,error}=await sb.rpc('aeromind_support_chat_unread_count');
   if(!mounted||error)return;
   setUnread(typeof data==='number'&&Number.isFinite(data)?Math.max(0,data):0);
   setReady(true);
  };
  void poll();
  const interval=window.setInterval(()=>{if(document.visibilityState==='visible')void poll()},12000);
  const onFocus=()=>void poll();
  window.addEventListener('focus',onFocus);
  return ()=>{mounted=false;window.clearInterval(interval);window.removeEventListener('focus',onFocus)};
 },[sb]);
 useEffect(()=>{setOpen(false)},[pathname]);
 function toggle(){
  if(open)void refreshUnread();
  setOpen(v=>!v);
 }
 return <div className="asf-root">
  {open&&<section className="asf-panel" role="dialog" aria-modal="false" aria-label="Atendimento aos clientes AeroMind">
   <header className="asf-header">
    <div><span className="asf-kicker">AEROMIND ADMIN · CENTRAL DE ATENDIMENTO</span>
     <h2>Atendimento aos clientes</h2>
     <p>Abra uma conversa, responda e acompanhe o atendimento.</p>
    </div>
    <button type="button" className="asf-close" aria-label="Fechar atendimentos" onClick={toggle}>×</button>
   </header>
   <div className="asf-panel-body"><SupportAdminChat compact/></div>
  </section>}
  <button type="button"
   className={'asf-launcher'+(ready&&unread>0&&!open?' asf-has-unread':'')}
   aria-label={open?'Fechar atendimento aos clientes':unread>0?'Atendimento aos clientes, '+unread+' mensagens não lidas':'Abrir atendimento aos clientes'}
   aria-expanded={open} onClick={toggle}>
   <span className="asf-icon" aria-hidden="true">{open?'×':<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17.5c-2.1-.8-3.5-2.7-3.5-5a8.5 8.5 0 0 1 17 0c0 4.4-3.7 8-8.4 8-1.3 0-2.7-.3-3.8-.8L3 21l1.4-3.6"/><path d="M8 11.4h.01M12 11.4h.01M16 11.4h.01"/></svg>}</span>
   <span>{open?'Fechar':'Atendimento'}</span>
   {ready&&unread>0&&<span className="asf-badge" aria-label={unread+' mensagens não lidas'}>{unread>99?'99+':unread}</span>}
  </button>
 </div>;
}
