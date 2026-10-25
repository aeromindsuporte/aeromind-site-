'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/browser';
import './admin-chat.css';

type Thread={id:string;user_id:string;client:string;subject:string;status:string;updated_at:string;created_at:string;preview:string|null;unread:number};
type Message={id:string;ticket_id:string;author_id:string;content:string;created_at:string};
const time=(value:string)=>new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});

export function SupportAdminChat({initialTicket}:{initialTicket?:string}){
 const sb=useMemo(()=>createClient(),[]);
 const [threads,setThreads]=useState<Thread[]>([]);
 const [selected,setSelected]=useState<string|null>(initialTicket||null);
 const [messages,setMessages]=useState<Message[]>([]);
 const [reply,setReply]=useState('');
 const [staffId,setStaffId]=useState('');
 const [status,setStatus]=useState('');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [enableAlerts,setEnableAlerts]=useState(false);
 const baseline=useRef<number|null>(null);
 const idRef=useRef(selected);idRef.current=selected;
 const bottom=useRef<HTMLDivElement>(null);

 const refresh=useCallback(async()=>{
  const {data:{user}}=await sb.auth.getUser();
  if(!user){setError('Sua sessão expirou. Entre novamente.');return}
  setStaffId(user.id);
  const {data,error:inboxError}=await sb.rpc('aeromind_support_chat_admin_inbox');
  if(inboxError||!data?.ok){setError('Não foi possível consultar os atendimentos.');return}
  const list=(Array.isArray(data.items)?data.items:[]) as Thread[];
  setThreads(list);
  const unread=list.reduce((total,t)=>total+(t.unread||0),0);
  if(baseline.current!==null&&unread>baseline.current&&typeof window!=='undefined'&&
    'Notification' in window&&Notification.permission==='granted'&&document.visibilityState==='hidden'){
   const alert=new Notification('Nova mensagem no suporte AeroMind',{body:'Um cliente enviou uma mensagem. Abra o painel de suporte.',tag:'aeromind-support'});
   alert.onclick=()=>{window.focus();alert.close()};
  }
  baseline.current=unread;
  const id=idRef.current&&list.some(t=>t.id===idRef.current)?idRef.current:list[0]?.id||null;
  if(!idRef.current&&id){setSelected(id);idRef.current=id}
  if(id){
   const {data:chat,error:messageError}=await sb.from('aeromind_support_messages')
     .select('id,ticket_id,author_id,content,created_at').eq('ticket_id',id)
     .order('created_at',{ascending:true}).limit(300);
   if(messageError){setError('Não foi possível carregar a conversa.');return}
   setMessages(chat||[]);
   if(document.visibilityState==='visible'){
    await sb.rpc('aeromind_support_chat_seen',{p_ticket_id:id});
    setThreads(old=>old.map(t=>t.id===id?{...t,unread:0}:t));
   }
  }
 },[sb]);
 useEffect(()=>{
  void refresh();
  const timer=window.setInterval(()=>{void refresh()},10000);
  return ()=>window.clearInterval(timer);
 },[refresh]);
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:'smooth',block:'end'})},[messages.length,selected]);

 async function pick(id:string){
  idRef.current=id;setSelected(id);setMessages([]);setError('');
  await refresh();
 }
 async function send(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selected||reply.trim().length<2||busy)return;
  setBusy(true);setError('');
  const {error:sendError}=await sb.rpc('aeromind_support_chat_send',{
    p_ticket_id:selected,p_message:reply.trim(),p_subject:'Atendimento AeroMind'
  });
  setBusy(false);
  if(sendError){setError('A resposta não foi enviada. Tente novamente.');return}
  setReply('');await refresh();
 }
 async function changeStatus(value:string){
  if(!selected)return;
  setBusy(true);
  const {data,error:statusError}=await sb.rpc('aeromind_support_chat_set_status',{p_ticket_id:selected,p_status:value});
  setBusy(false);
  if(statusError||data!==true){setError('Não foi possível alterar a situação.');return}
  await refresh();
 }
 async function askAlerts(){
  if(!('Notification' in window)){setError('Este navegador não suporta alertas na área de trabalho.');return}
  const permission=await Notification.requestPermission();
  setEnableAlerts(permission==='granted');
  if(permission!=='granted')setError('Avisos do navegador não foram autorizados. O contador continuará funcionando dentro do site.');
 }
 const current=threads.find(t=>t.id===selected);
 const total=threads.reduce((n,t)=>n+(t.unread||0),0);
 return <div className="sa-wrap">
  <div className="sa-toolbar"><div><strong>{total} mensagem(ns) aguardando</strong><span>Atualização automática enquanto a sessão estiver aberta</span></div>
   <button type="button" onClick={()=>void askAlerts()}>{enableAlerts?'✓ Avisos ativados':'🔔 Ativar avisos no navegador'}</button>
   <button type="button" onClick={()=>void refresh()}>↻ Atualizar</button>
  </div>
  {error&&<p role="alert" className="sa-error">{error}</p>}
  <div className="sa-grid">
   <aside className="sa-list" aria-label="Conversas de clientes">
    <h2>Caixa de entrada <b>{threads.length}</b></h2>
    {threads.length===0&&<p className="sa-none">Ainda não há conversas de clientes.</p>}
    {threads.map(t=><button type="button" key={t.id} onClick={()=>void pick(t.id)}
      className={'sa-list-item '+(selected===t.id?'active':'')}>
     <span className="sa-avatar" aria-hidden="true">◉</span>
     <span className="sa-list-copy"><strong>{t.client}</strong><small>{t.subject}</small>
      <em>{t.preview||'Aguardando mensagem'}</em>
      <span>{time(t.updated_at)} · {t.status==='resolved'?'Encerrado':t.status==='open'?'Novo':'Em atendimento'}</span>
     </span>{t.unread>0&&<b className="sa-count">{t.unread}</b>}
    </button>)}
   </aside>
   <section className="sa-conversation" aria-label="Chat do cliente">
    {current?<><header className="sa-chat-top">
      <div><strong>{current.client}</strong><span>{current.subject}</span><small><Link href={'/admin/cliente/'+current.user_id}>Abrir cadastro ↗</Link></small></div>
      <select value={current.status} aria-label="Situação do atendimento" disabled={busy} onChange={e=>void changeStatus(e.target.value)}>
       <option value="open">Novo</option><option value="in_progress">Em atendimento</option><option value="resolved">Encerrado</option>
      </select>
     </header>
     <div className="sa-messages" role="log" aria-label="Mensagens do atendimento">
      {messages.map(m=><article key={m.id} className={'sa-message '+(m.author_id===current.user_id?'client':'admin')}>
       <span>{m.author_id===current.user_id?'Cliente':'Equipe AeroMind'}</span><p>{m.content}</p><small>{time(m.created_at)}</small>
      </article>)}
      <div ref={bottom}/>
     </div>
     <form className="sa-reply" onSubmit={send}>
      <textarea aria-label="Responder ao cliente" value={reply} onChange={e=>setReply(e.target.value)} rows={3} minLength={2} maxLength={3000}
       placeholder="Digite sua resposta para o cliente…" required onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/>
      <button type="submit" disabled={busy||reply.trim().length<2}>{busy?'Enviando…':'Enviar resposta ➤'}</button>
      <small>O cliente verá sua resposta no chat, sem precisar abrir outro chamado.</small>
     </form>
     </>:<div className="sa-placeholder">Escolha uma conversa para responder ao cliente.</div>}
   </section>
  </div>
 </div>;
}
