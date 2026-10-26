'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';

export type NotificationItem={id:string;title:string;body:string;category:string;priority:string;published_at:string;expires_at:string|null;read_at:string|null;cta_label:string;cta_path:string};
type Props={items:NotificationItem[];markRead:(formData:FormData)=>void|Promise<void>;initialFilter?:string};
const labels:Record<string,string>={radar:'Radar Ao Vivo',comunicado:'Comunicado',atualizacao:'Atualização',licenca:'Licença'};
const categories=['radar','comunicado','atualizacao','licenca'];
const when=(date:string)=>new Date(date).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
export function NotificationList({items,markRead,initialFilter='todas'}:Props){
 const [filter,setFilter]=useState(initialFilter==='nao-lidas'?'nao-lidas':'todas');
 const [active,setActive]=useState<NotificationItem|null>(null);
 const now=Date.now();
 const valid=(n:NotificationItem)=>!n.expires_at||new Date(n.expires_at).getTime()>now;
 const unread=useMemo(()=>items.filter(n=>!n.read_at&&valid(n)),[items]);
 const counts=useMemo(()=>Object.fromEntries(categories.map(c=>[c,unread.filter(n=>n.category===c).length])),[unread]);
 const filtered=items.filter(n=>(filter!=='nao-lidas'||(!n.read_at&&valid(n)))&&(filter==='todas'||filter==='nao-lidas'||n.category===filter));
 return <section className="ni-interactive">
  <nav className="ni-filters" aria-label="Filtrar notificações">
   <button type="button" className={filter==='todas'?'active':''} onClick={()=>setFilter('todas')}>Todas <b>{unread.length}</b></button>
   <button type="button" className={filter==='nao-lidas'?'active':''} onClick={()=>setFilter('nao-lidas')}>Não lidas <b>{unread.length}</b></button>
   {categories.map(c=><button key={c} type="button" className={filter===c?'active':''} onClick={()=>setFilter(c)}>{labels[c]} <b>{counts[c]||0}</b></button>)}
  </nav>
  <div className="ni-list">
   {filtered.map(n=>{const expired=!valid(n);const isUnread=!n.read_at&&!expired;return <article className={'ni-card'+(isUnread?' ni-unread':'')} key={n.id}>
    <div className="ni-top"><span className="ni-category">{labels[n.category]||'AeroMind'}</span><span className={'ni-state'+(expired?' expired':'')}>{expired?'Expirada':n.read_at?'Lida':'Nova'}</span></div>
    <h2>{n.title}</h2><p className="ni-preview">{n.body}</p>
    {n.category==='radar'&&<p className="ni-caution">Informação histórica; não representa garantia de resultado.</p>}
    <small>Enviada em {when(n.published_at)}{n.expires_at?' · Válida até '+when(n.expires_at):''}</small>
    <div className="ni-actions">
     <button type="button" onClick={()=>setActive(n)}>Ler mensagem ↗</button>
     {isUnread&&<form action={markRead}><input name="id" type="hidden" value={n.id}/><button type="submit">✓ Marcar como lida</button></form>}
     {!expired&&<Link href={n.cta_path||'/minha-conta'} className="ni-go">{n.cta_label||'Abrir'} ↗</Link>}
    </div>
   </article>})}
   {!filtered.length&&<div className="ni-empty"><span>♧</span><strong>Nenhuma notificação por aqui.</strong><p>Os avisos publicados para sua conta aparecerão neste espaço.</p></div>}
  </div>
  {active&&<div className="ni-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setActive(null)}} onKeyDown={e=>{if(e.key==='Escape')setActive(null)}}>
   <section className="ni-modal" role="dialog" aria-modal="true" aria-labelledby="ni-modal-title">
    <div className="ni-modal-head"><span className="ni-category">{labels[active.category]||'AeroMind'}</span><button type="button" aria-label="Fechar mensagem" onClick={()=>setActive(null)}>×</button></div>
    <h2 id="ni-modal-title">{active.title}</h2><p className="ni-modal-body">{active.body}</p>
    <small>Enviada em {when(active.published_at)}</small>
    <div className="ni-actions">
     {!active.read_at&&<form action={markRead}><input name="id" type="hidden" value={active.id}/><button type="submit">✓ Marcar como lida</button></form>}
     {!active.expires_at||new Date(active.expires_at).getTime()>now?<Link href={active.cta_path||'/minha-conta'} className="ni-go">{active.cta_label||'Abrir'} ↗</Link>:null}
     <button type="button" onClick={()=>setActive(null)}>Fechar</button>
    </div>
   </section>
  </div>}
 </section>;
}
