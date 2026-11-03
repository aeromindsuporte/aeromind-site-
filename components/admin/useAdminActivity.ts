'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/browser';

export type AdminActivityEvent={
 id:number;
 event_type:'signup'|'trial_click'|'trial_activated';
 user_id:string|null;
 email:string|null;
 plan_slug:string|null;
 occurred_at:string;
};

export function activityTitle(event:AdminActivityEvent){
 if(event.event_type==='signup')return 'Novo cadastro';
 if(event.event_type==='trial_activated')return 'Teste grátis ativado';
 return 'Clique no teste grátis';
}
export function activityDescription(event:AdminActivityEvent){
 const subject=event.email||'Visitante ainda não cadastrado';
 if(event.event_type==='signup')return subject+' criou uma conta AeroMind.';
 if(event.event_type==='trial_activated')return subject+' ativou o teste gratuito.';
 return subject+' demonstrou interesse no teste grátis.';
}
export function activityTime(date:string){
 return new Date(date).toLocaleString('pt-BR',{
  timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit'
 });
}

export function useAdminActivity(){
 const sb=useMemo(()=>createClient(),[]);
 const [events,setEvents]=useState<AdminActivityEvent[]>([]);
 const [unread,setUnread]=useState(0);
 const [lastSeen,setLastSeen]=useState('1970-01-01T00:00:00.000Z');
 const [incoming,setIncoming]=useState<AdminActivityEvent|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const loaded=useRef(false);
 const latestId=useRef<number|null>(null);
 const active=useRef(true);
 const serial=useRef(0);

 const refresh=useCallback(async()=>{
  const n=++serial.current;
  const [list,cursor]=await Promise.all([
   sb.from('aeromind_admin_activity_events')
    .select('id,event_type,user_id,email,plan_slug,occurred_at')
    .order('occurred_at',{ascending:false}).order('id',{ascending:false}).limit(100),
   sb.from('aeromind_admin_activity_cursors')
    .select('last_seen_at').limit(1).maybeSingle()
  ]);
  if(!active.current||n!==serial.current)return;
  if(list.error||cursor.error){
   setError('Não foi possível consultar os avisos agora. A conexão será retomada automaticamente.');
   setLoading(false);
   return;
  }
  const seen=cursor.data?.last_seen_at||'1970-01-01T00:00:00.000Z';
  const count=await sb.from('aeromind_admin_activity_events')
   .select('id',{count:'exact',head:true}).gt('occurred_at',seen);
  if(!active.current||n!==serial.current)return;
  if(count.error){
   setError('Não foi possível atualizar a contagem de avisos.');
  }else{
   setError('');
   setUnread(count.count||0);
  }
  const next=(list.data||[]) as AdminActivityEvent[];
  if(loaded.current&&next[0]&&latestId.current!==null&&next[0].id>latestId.current){
   setIncoming(next[0]);
  }
  if(next[0])latestId.current=Math.max(latestId.current||0,next[0].id);
  loaded.current=true;
  setEvents(next);
  setLastSeen(seen);
  setLoading(false);
 },[sb]);

 useEffect(()=>{
  active.current=true;
  void refresh();
  const channel=sb.channel('aeromind-staff-activity-'+Math.random().toString(36).slice(2))
   .on('postgres_changes',
    {event:'INSERT',schema:'public',table:'aeromind_admin_activity_events'},
    ()=>void refresh()
   ).subscribe();
  // Realtime provides immediate changes; 10s polling covers temporary socket loss.
  const interval=window.setInterval(()=>{
   if(document.visibilityState==='visible')void refresh();
  },10000);
  const onFocus=()=>void refresh();
  const onVisible=()=>{if(document.visibilityState==='visible')void refresh();};
  window.addEventListener('focus',onFocus);
  document.addEventListener('visibilitychange',onVisible);
  return ()=>{
   active.current=false;serial.current++;
   window.clearInterval(interval);
   window.removeEventListener('focus',onFocus);
   document.removeEventListener('visibilitychange',onVisible);
   void sb.removeChannel(channel);
  };
 },[sb,refresh]);

 const markSeen=useCallback(async()=>{
  const {error:markError}=await sb.rpc('aeromind_admin_activity_mark_seen');
  if(markError){setError('Não foi possível marcar os avisos como vistos.');return false;}
  await refresh();
  return true;
 },[sb,refresh]);
 return {events,unread,lastSeen,incoming,setIncoming,loading,error,markSeen,refresh};
}