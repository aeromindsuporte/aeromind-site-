'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {activityDescription,activityTime,activityTitle,useAdminActivity} from './useAdminActivity';

export function AdminActivityBell(){
 const {events,unread,lastSeen,incoming,setIncoming,loading,error,markSeen}=useAdminActivity();
 const [open,setOpen]=useState(false);
 const wrapper=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{
  const outside=(event:MouseEvent)=>{
   if(wrapper.current&&!wrapper.current.contains(event.target as Node))setOpen(false);
  };
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
  document.addEventListener('mousedown',outside);
  document.addEventListener('keydown',escape);
  return ()=>{
   document.removeEventListener('mousedown',outside);
   document.removeEventListener('keydown',escape);
  };
 },[]);
 useEffect(()=>{
  if(!incoming)return;
  if(document.visibilityState==='hidden'&&'Notification' in window&&Notification.permission==='granted'){
   const note=new Notification('AeroMind • '+activityTitle(incoming),{
    body:activityDescription(incoming),tag:'aeromind-activity-'+incoming.id
   });
   note.onclick=()=>{
    window.focus();window.location.href='/admin/atividade';note.close();
   };
  }
  const timer=window.setTimeout(()=>setIncoming(null),7000);
  return ()=>window.clearTimeout(timer);
 },[incoming,setIncoming]);
 return <div className="am-activity-bell-wrap" ref={wrapper}>
  <button type="button" className="admin-notification-bell am-activity-bell"
   aria-label={'Avisos de cadastros e testes'+(unread?' — '+unread+' não vistos':'')}
   aria-haspopup="dialog" aria-expanded={open}
   onClick={()=>setOpen(v=>!v)}>
   <span aria-hidden="true">🔔</span>
   {unread>0&&<span className="am-activity-count">{unread>99?'99+':unread}</span>}
  </button>
  {open&&<section className="am-activity-popover" role="dialog" aria-label="Atividade de clientes em tempo real">
   <div className="am-activity-popover-head">
    <div><strong>Atividade ao vivo</strong><small>Cadastros e testes gratuitos</small></div>
    <button type="button" className="am-activity-close" onClick={()=>setOpen(false)} aria-label="Fechar notificações">×</button>
   </div>
   {error&&<p className="am-activity-error" role="alert">{error}</p>}
   <div className="am-activity-popover-list">
    {loading?<p className="am-activity-empty">Carregando atividades…</p>:
     events.length===0?<p className="am-activity-empty">Os próximos cliques no teste e cadastros aparecerão aqui automaticamente.</p>:
     events.slice(0,8).map(event=><Link key={event.id}
      href={event.user_id?'/admin/cliente/'+event.user_id:'/admin/atividade'}
      onClick={()=>setOpen(false)}
      className={'am-activity-entry '+(Date.parse(event.occurred_at)>Date.parse(lastSeen)?'unseen':'')}>
       <span className="am-activity-entry-icon" aria-hidden="true">{event.event_type==='signup'?'👤':event.event_type==='trial_activated'?'✅':'🎁'}</span>
       <span><strong>{activityTitle(event)}</strong><small>{activityDescription(event)}</small><time dateTime={event.occurred_at}>{activityTime(event.occurred_at)}</time></span>
      </Link>)}
   </div>
   <div className="am-activity-popover-actions">
    <button type="button" onClick={()=>void markSeen()} disabled={unread===0}>Marcar como vistas</button>
    <Link href="/admin/atividade" onClick={()=>setOpen(false)}>Ver histórico →</Link>
   </div>
  </section>}
  {incoming&&!open&&<div className="am-activity-toast" role="status" aria-live="polite">
   <span aria-hidden="true">{incoming.event_type==='signup'?'👤':incoming.event_type==='trial_activated'?'✅':'🎁'}</span>
   <Link href="/admin/atividade" onClick={()=>setIncoming(null)}>
    <strong>{activityTitle(incoming)}</strong>
    <small>{activityDescription(incoming)}</small>
   </Link>
   <button type="button" onClick={()=>setIncoming(null)} aria-label="Dispensar aviso">×</button>
  </div>}
 </div>;
}