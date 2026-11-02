'use client';
import {useMemo,useState} from 'react';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/browser';
import {feedbackStatusLabel,type FeedbackItem} from '@/components/feedback/FeedbackForm';
import './feedback-admin.css';
const types:Record<string,string>={melhoria:'Melhoria',problema:'Problema',elogio:'Elogio',outro:'Opinião'};
const statusChoices=[
 ['novo','Recebida'],['em_analise','Em análise'],['planejado','No planejamento'],
 ['implementado','Implementada'],['arquivado','Concluída']
] as const;
const format=(d:string)=>new Date(d).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
export function FeedbackInbox({initial,loadError}:{initial:FeedbackItem[];loadError:boolean}){
 const [entries,setEntries]=useState(initial);
 const [filter,setFilter]=useState('todos');
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState<string|null>(initial[0]?.id||null);
 const [note,setNote]=useState(initial[0]?.admin_reply||'');
 const [status,setStatus]=useState(initial[0]?.status||'novo');
 const [editing,setEditing]=useState(!initial[0]?.admin_reply?.trim());
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState(loadError?'Não foi possível consultar a caixa de ideias.':'');
 const [success,setSuccess]=useState('');
 const visible=useMemo(()=>entries.filter(x=>(filter==='todos'||x.status===filter)&&
  (!search.trim()||(x.title+' '+x.message+' '+x.category).toLocaleLowerCase('pt-BR')
   .includes(search.trim().toLocaleLowerCase('pt-BR')))),[entries,filter,search]);
 const chosen=entries.find(x=>x.id===selected)||null;
 const pending=entries.filter(x=>x.status==='novo').length;
 function choose(x:FeedbackItem){
  setSelected(x.id);setStatus(x.status);setNote(x.admin_reply||'');
  setEditing(!x.admin_reply?.trim());setError('');setSuccess('');
 }
 function cancelEdit(){
  if(!chosen)return;
  setStatus(chosen.status);setNote(chosen.admin_reply||'');
  setEditing(false);setError('');setSuccess('');
 }
 function beginEdit(){
  if(!chosen)return;
  setStatus(chosen.status);setNote(chosen.admin_reply||'');
  setEditing(true);setError('');setSuccess('');
 }
 async function save(){
  if(!chosen||saving)return;
  if(note.length>1200){setError('A resposta pode ter até 1.200 caracteres.');return}
  setSaving(true);setError('');setSuccess('');
  try{
   const sb=createClient();
   const {error:authError,data:{user}}=await sb.auth.getUser();
   if(authError||!user){setError('Sessão expirada. Entre novamente no painel.');return;}
   const {data,error:saveError}=await sb.from('aeromind_feedback')
    .update({status,admin_reply:note.trim()||null})
    .eq('id',chosen.id)
    .select('id,status,admin_reply,updated_at').single();
   if(saveError||!data){setError('Não foi possível atualizar. Confirme seu acesso administrativo e tente novamente.');return;}
   setEntries(prev=>prev.map(x=>x.id===data.id?{...x,status:data.status,admin_reply:data.admin_reply,updated_at:data.updated_at}:x));
   setEditing(!data.admin_reply?.trim());
   setSuccess('Atualização salva e visível para o cliente.');
  }catch{setError('Falha de conexão ao salvar.');}
  finally{setSaving(false);}
 }
 return <section className="fba-root" aria-label="Painel de sugestões AeroMind">
  <div className="fba-topline">
   <div className="fba-stat"><b>{entries.length}</b><span>Contribuições recebidas</span></div>
   <div className="fba-stat pending"><b>{pending}</b><span>Aguardando análise</span></div>
   <div className="fba-stat accepted"><b>{entries.filter(x=>x.status==='implementado').length}</b><span>Implementadas</span></div>
  </div>
  <div className="fba-filters">
   <label>Buscar ideia <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por palavra ou categoria..." /></label>
   <label>Situação <select value={filter} onChange={e=>setFilter(e.target.value)}>
    <option value="todos">Todas as situações</option>
    {statusChoices.map(([key,label])=><option key={key} value={key}>{label}</option>)}
   </select></label>
  </div>
  <div className="fba-grid">
   <div className="fba-list" aria-label="Sugestões enviadas por clientes">
    {visible.length?visible.map(x=><button type="button" key={x.id} onClick={()=>choose(x)}
     aria-pressed={chosen?.id===x.id} className={'fba-entry'+(chosen?.id===x.id?' active':'')}>
     <span className="fba-entry-top"><span className={'fb-status status-'+x.status}>{feedbackStatusLabel[x.status]}</span><time dateTime={x.created_at}>{format(x.created_at)}</time></span>
     <strong>{x.title}</strong>
     <small>{types[x.category]||'Opinião'} · {x.message.slice(0,85)}{x.message.length>85?'…':''}</small>
    </button>):<p className="fba-empty">{loadError?'Falha ao carregar as contribuições.':'Nenhuma contribuição para os filtros selecionados.'}</p>}
   </div>
   <div className="fba-detail" aria-label="Gerenciar contribuição">
    {chosen?<><div className="fba-detail-head">
     <div><span className="fb-kicker">VOZ DO CLIENTE · {types[chosen.category]||'Feedback'}</span><h2>{chosen.title}</h2></div>
     <span className={'fb-status status-'+chosen.status}>{feedbackStatusLabel[chosen.status]}</span>
    </div>
    <p className="fba-message">{chosen.message}</p>
    <div className="fba-meta"><span>Recebida: {format(chosen.created_at)}</span>
      <span>Nota: {chosen.rating?chosen.rating+'/5 ★':'Não informada'}</span>
      <Link href={'/admin/cliente/'+chosen.user_id}>Ver cadastro do cliente ↗</Link>
    </div>
    {chosen.admin_reply?.trim()&&!editing&&<div className="fba-reply-summary" aria-label="Resposta enviada ao cliente">
      <div className="fba-reply-heading">
       <span className="fba-reply-label">✓ Respondida pela equipe</span>
       <button type="button" className="fba-edit-reply" onClick={beginEdit}>✎ Editar resposta</button>
      </div>
      <p className="fba-reply-content">{chosen.admin_reply}</p>
     </div>}
    {editing&&<div className="fba-editor" aria-label="Editar andamento e resposta">
      <div className="fba-editor-heading"><strong>{chosen.admin_reply?.trim()?'Editar resposta':'Responder ao cliente'}</strong><span>As alterações aparecerão no histórico do cliente.</span></div>
      <label>Situação da ideia <select value={status} onChange={e=>setStatus(e.target.value)}>
        {statusChoices.map(([k,v])=><option value={k} key={k}>{v}</option>)}
      </select></label>
      <label>Resposta para o cliente <span>(opcional)</span>
       <textarea rows={4} maxLength={1200} value={note} onChange={e=>setNote(e.target.value)}
         placeholder="Obrigado por enviar sua sugestão! Estamos avaliando como levar essa melhoria ao AeroMind."/>
       <small>{note.length}/1200 · Visível somente ao autor da sugestão</small>
      </label>
      {error&&<p className="fb-alert bad" role="alert">{error}</p>}
      <div className="fba-editor-actions">
       {chosen.admin_reply?.trim()&&<button type="button" className="fba-cancel-edit" onClick={cancelEdit} disabled={saving}>Cancelar</button>}
       <button type="button" className="fba-save-reply" onClick={save} disabled={saving}>
        {saving?'Salvando...':'Salvar resposta e andamento ↗'}</button>
      </div>
     </div>}
    {success&&!editing&&<p className="fba-saved-hint" role="status">✓ {success}</p>}
    </>:<p className="fba-empty">Selecione uma contribuição na lista para analisar e responder.</p>}
   </div>
  </div>
  <p className="fba-footer-note">As mensagens são privadas. Apenas a equipe autorizada e cada autor podem consultá-las. Trate os comentários dos usuários com respeito e sem prometer datas de implementação.</p>
 </section>;
}
