'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {activityDescription,activityTime,activityTitle,useAdminActivity} from './useAdminActivity';
import type {AdminActivityEvent} from './useAdminActivity';
type Filter='all'|AdminActivityEvent['event_type'];
const filters:{key:Filter;label:string}[]=[
 {key:'all',label:'Todos'},
 {key:'signup',label:'Cadastros'},
 {key:'trial_click',label:'Cliques no teste'},
 {key:'trial_activated',label:'Testes ativados'}
];

export function AdminActivityFeed(){
 const {events,unread,lastSeen,loading,error,markSeen,refresh}=useAdminActivity();
 const [filter,setFilter]=useState<Filter>('all');
 const items=useMemo(()=>events.filter(e=>filter==='all'||e.event_type===filter),[events,filter]);
 const count=(type:AdminActivityEvent['event_type'])=>events.filter(e=>e.event_type===type).length;
 return <div className="am-activity-dashboard">
  <section className="am-activity-info">
   <div><strong>◉ Atualização automática</strong><p>Os novos eventos chegam em tempo real, com reconexão e verificação periódica. Nenhum clique é considerado ativação.</p></div>
   <button type="button" onClick={()=>void refresh()}>↻ Atualizar agora</button>
  </section>
  <div className="am-activity-stats">
   <article><span>👤 Cadastros</span><strong>{count('signup')}</strong></article>
   <article><span>🎁 Cliques no teste</span><strong>{count('trial_click')}</strong></article>
   <article><span>✅ Testes ativados</span><strong>{count('trial_activated')}</strong></article>
   <article><span>🔔 Não vistos</span><strong>{unread}</strong></article>
  </div>
  <p className="am-activity-stats-note">Os três primeiros números representam os 100 eventos mais recentes; o total de avisos não vistos considera todo o histórico.</p>
  <section className="am-activity-history">
   <header><div><h2>Histórico de atividades</h2><small>Horário de Brasília · São Paulo</small></div>
    <button type="button" disabled={unread===0} onClick={()=>void markSeen()}>✓ Marcar tudo como visto</button></header>
   <div className="am-activity-filters" role="group" aria-label="Filtrar tipo de atividade">
    {filters.map(f=><button key={f.key} type="button" className={filter===f.key?'selected':''}
     aria-pressed={filter===f.key} onClick={()=>setFilter(f.key)}>{f.label}</button>)}
   </div>
   {error&&<p className="am-activity-error" role="alert">{error}</p>}
   {loading?<p className="am-activity-empty">Carregando atividades…</p>:
    !items.length?<p className="am-activity-empty">Nenhum evento neste filtro por enquanto.</p>:
    <ol className="am-activity-timeline">
     {items.map(e=><li key={e.id} className={Date.parse(e.occurred_at)>Date.parse(lastSeen)?'am-activity-unseen':''}>
      <span className="am-activity-entry-icon" aria-hidden="true">{e.event_type==='signup'?'👤':e.event_type==='trial_activated'?'✅':'🎁'}</span>
      <div><strong>{activityTitle(e)}</strong><p>{activityDescription(e)}</p>
       <time dateTime={e.occurred_at}>{activityTime(e.occurred_at)}</time>
       {e.user_id&&<Link href={'/admin/cliente/'+e.user_id}>Ver cadastro →</Link>}
       {!e.user_id&&<span className="am-activity-guest">Visitante não identificado</span>}
      </div>
      {Date.parse(e.occurred_at)>Date.parse(lastSeen)&&<span className="am-activity-new">Novo</span>}
     </li>)}
    </ol>}
  </section>
 </div>;
}