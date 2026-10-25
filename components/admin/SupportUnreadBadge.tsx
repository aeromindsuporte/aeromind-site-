'use client';
import {useEffect,useMemo,useState} from 'react';
import {createClient} from '@/lib/supabase/browser';

/** Polls the staff-only unread RPC while the dashboard is open. */
export function SupportUnreadBadge(){
 const sb=useMemo(()=>createClient(),[]);
 const [unread,setUnread]=useState(0);
 useEffect(()=>{
  let live=true;
  const check=async()=>{
   if(document.visibilityState!=='visible')return;
   const {data,error}=await sb.rpc('aeromind_support_chat_unread_count');
   if(live&&!error)setUnread(typeof data==='number'?data:0);
  };
  void check();
  const timer=window.setInterval(()=>void check(),12000);
  window.addEventListener('focus',check);
  return ()=>{live=false;window.clearInterval(timer);window.removeEventListener('focus',check)};
 },[sb]);
 return unread>0?<span className="admin-alert-badge" aria-label={unread+' mensagens de clientes não lidas'}>{unread>99?'99+':unread}</span>:null;
}
