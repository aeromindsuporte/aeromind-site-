'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {createClient} from '@/lib/supabase/browser';

/** Polls the staff-only unread RPC while the dashboard is open. */
export function SupportUnreadBadge(){
 const sb=useMemo(()=>createClient(),[]);
 const pathname=usePathname();
 const previous=useRef<number|null>(null);
 const [unread,setUnread]=useState(0);
 useEffect(()=>{
  let live=true;
  const check=async()=>{
   const {data,error}=await sb.rpc('aeromind_support_chat_unread_count');
   if(!live||error)return;
   const n=typeof data==='number'?data:0;
   if(previous.current!==null&&n>previous.current&&!pathname?.startsWith('/admin/suporte')&&
      document.visibilityState==='hidden'&&'Notification' in window&&Notification.permission==='granted'){
      const notification=new Notification('AeroMind • Nova mensagem de suporte',
       {body:'Um cliente enviou uma mensagem. Abra o administrativo para responder.',tag:'aeromind-support-global'});
      notification.onclick=()=>{window.focus();window.location.href='/admin/suporte';notification.close()};
   }
   previous.current=n;
   setUnread(n);
  };
  void check();
  const timer=window.setInterval(()=>void check(),12000);
  window.addEventListener('focus',check);
  return ()=>{live=false;window.clearInterval(timer);window.removeEventListener('focus',check)};
 },[sb,pathname]);
 return unread>0?<span className="admin-alert-badge" aria-label={unread+' mensagens de clientes não lidas'}>{unread>99?'99+':unread}</span>:null;
}
