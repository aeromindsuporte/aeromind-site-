'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/browser';
import './support-chat.css';

type Ticket={id:string;subject:string;status:string;updated_at:string};
type Message={id:string;ticket_id:string;author_id:string;content:string;created_at:string};
const time=(date:string)=>new Date(date).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const errorMessage=(message:string)=>message.includes('rate')||message.includes('Aguarde')?
 'Você enviou muitas mensagens. Aguarde um pouco para continuar.':
 'Não foi possível enviar. Confira sua conexão e tente novamente.';

export function SupportChatPanel({embedded=false,initialSubject='Atendimento AeroMind'}:{embedded?:boolean;initialSubject?:string}){
 const sb=useMemo(()=>createClient(),[]);
 const [userId,setUserId]=useState<string|null>(null);
 const [checking,setChecking]=useState(true);
 const [tickets,setTickets]=useState<Ticket[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [messages,setMessages]=useState<Message[]>([]);
 const [message,setMessage]=useState('');
 const [subject,setSubject]=useState(initialSubject);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [newConversation,setNewConversation]=useState(false);
 const scroll=useRef<HTMLDivElement>(null);
 const selectedRef=useRef<string|null>(null);
 useEffect(()=>{selectedRef.current=selected},[selected]);

 const reload=useCallback(async()=>{
  const {data:{user},error:authError}=await sb.auth.getUser();
  if(authError||!user){setUserId(null);setChecking(false);return}
  setUserId(user.id);
  const {data:rows,error:listError}=await sb.from('aeromind_support_tickets')
    .select('id,subject,status,updated_at').eq('user_id',user.id)
    .order('updated_at',{ascending:false}).limit(40);
  if(listError){setError('Não foi possível carregar as conversas.');setChecking(false);return}
  const next=(rows||[]) as Ticket[];setTickets(next);
  const id=selectedRef.current && next.some(t=>t.id===selectedRef.current)?
     selectedRef.current:next.find(t=>t.status!=='resolved')?.id||next[0]?.id||null;
  if(!selectedRef.current&&id)setSelected(id);
  if(id){
   const {data:chat,error:chatError}=await sb.from('aeromind_support_messages')
    .select('id,ticket_id,author_id,content,created_at')
    .eq('ticket_id',id).order('created_at',{ascending:true}).limit(300);
   if(!chatError){setMessages(chat||[]);
      await sb.rpc('aeromind_support_chat_seen',{p_ticket_id:id});
   }else setError('Não foi possível carregar as mensagens.');
  }else setMessages([]);
  setChecking(false);
 },[sb]);
 useEffect(()=>{
  void reload();
  const poll=window.setInterval(()=>{if(document.visibilityState==='visible'&&!busy)void reload()},11000);
  return ()=>window.clearInterval(poll);
 },[reload,busy]);
 useEffect(()=>{scroll.current?.scrollTo({top:scroll.current.scrollHeight,behavior:'smooth'})},[messages.length,selected]);
 async function selectTicket(id:string){
  setSelected(id);selectedRef.current=id;setNewConversation(false);setMessages([]);setError('');
  const {data,error:chatError}=await sb.from('aeromind_support_messages').select('id,ticket_id,author_id,content,created_at')
    .eq('ticket_id',id).order('created_at',{ascending:true}).limit(300);
  if(!chatError){setMessages(data||[]);await sb.rpc('aeromind_support_chat_seen',{p_ticket_id:id})}
 }
 async function send(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();const body=message.trim();if(body.length<2||busy)return;
  setError('');setBusy(true);
  const id=newConversation||!tickets.length?null:selectedRef.current;
  const {data,resultError}=await (async()=>{
   const result=await sb.rpc('aeromind_support_chat_send',{
     p_ticket_id:id,p_message:body,p_subject:subject.trim()||'Atendimento AeroMind'
   });
   return {data:result.data,resultError:result.error};
  })();
  setBusy(false);
  if(resultError||!data?.ok){setError(errorMessage(resultError?.message||''));return}
  setMessage('');setSelected(data.ticket_id);selectedRef.current=data.ticket_id;
  setNewConversation(false);await reload();
 }
 if(checking)return <div className="sc-state">Carregando atendimento…</div>;
 if(!userId)return <div className="sc-login"><p>Entre na sua conta AeroMind para falar com nossa equipe e acompanhar as respostas em segurança.</p>
  <Link href="/entrar?next=%2Fsuporte" className="sc-primary">Entrar para conversar</Link>
  <Link href="/cadastro" className="sc-secondary">Criar minha conta</Link></div>;
 const active=tickets.find(t=>t.id===selected);
 const canReply=!active||active.status!=='resolved';
 return <div className={'sc-client '+(embedded?'sc-embedded':'')}>
  <div className="sc-client-toolbar">
   <select aria-label="Conversa selecionada" value={newConversation?'new':selected||'new'}
    onChange={e=>{if(e.target.value==='new'){setNewConversation(true);setMessages([]);setSelected(null);selectedRef.current=null;}else void selectTicket(e.target.value)}}>
    {tickets.map(t=><option key={t.id} value={t.id}>{t.subject} · {t.status==='resolved'?'Encerrada':'Aberta'}</option>)}
    <option value="new">+ Nova conversa</option>
   </select>
   <button type="button" title="Atualizar conversa" aria-label="Atualizar conversa" onClick={()=>void reload()}>↻</button>
  </div>
  <div className="sc-thread" ref={scroll} role="log" aria-label="Mensagens da conversa" aria-live="polite">
   {(!active||newConversation)&&<div className="sc-empty"><span aria-hidden="true">✦</span><strong>Olá! Como podemos ajudar?</strong><p>Escreva sua dúvida. A equipe responderá nesta conversa.</p></div>}
   {!newConversation&&messages.map(m=><div key={m.id} className={'sc-bubble '+(m.author_id===userId?'mine':'staff')}>
     <span>{m.author_id===userId?'Você':'Suporte AeroMind'}</span>
     <p>{m.content}</p><small>{time(m.created_at)}</small>
   </div>)}
   {!newConversation&&active?.status==='resolved'&&<div className="sc-closed">Atendimento encerrado. Para continuar, inicie uma nova conversa.</div>}
  </div>
  {error&&<p className="sc-error" role="alert">{error}</p>}
  {(canReply||newConversation)&&<form onSubmit={send} className="sc-compose">
    {(newConversation||!tickets.length)&&<input aria-label="Assunto" value={subject} onChange={e=>setSubject(e.target.value)}
      placeholder="Assunto do atendimento" minLength={5} maxLength={140} required/>}
    <div className="sc-compose-row"><textarea aria-label="Mensagem" value={message} onChange={e=>setMessage(e.target.value)}
      placeholder="Escreva sua mensagem…" minLength={2} maxLength={3000} rows={2} required
      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/>
      <button type="submit" aria-label="Enviar mensagem" disabled={busy||message.trim().length<2}>{busy?'…':'➤'}</button>
    </div>
    <small>Enter para enviar · Shift + Enter para nova linha</small>
   </form>}
 </div>;
}

type FeedbackReplyAlert={id:string;title:string;admin_reply:string;status:string;admin_reply_at:string;reply_read_at:string|null};
export function SupportFloatingChat(){
 const route=usePathname();
 const router=useRouter();
 const [open,setOpen]=useState(false);
 const [unread,setUnread]=useState(0);
 const [feedbackReplies,setFeedbackReplies]=useState<FeedbackReplyAlert[]>([]);
 const [activeTab,setActiveTab]=useState<'chat'|'feedback'>('chat');
 const [reading,setReading]=useState<string|null>(null);
 const sb=useMemo(()=>createClient(),[]);
 const feedbackUnread=feedbackReplies.filter(f=>!f.reply_read_at).length;
 const combinedUnread=unread+feedbackUnread;
 useEffect(()=>{
  if(route?.startsWith('/admin')||route==='/suporte')return;
  let mounted=true;
  const load=async()=>{
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(!mounted)return;
   if(authError||!user){setUnread(0);setFeedbackReplies([]);return;}
   const [{data:chatCount},{data:replies,error:repliesError}]=await Promise.all([
    sb.rpc('aeromind_support_chat_unread_count'),
    sb.from('aeromind_feedback')
      .select('id,title,admin_reply,status,admin_reply_at,reply_read_at')
      .eq('user_id',user.id).not('admin_reply_at','is',null)
      .order('admin_reply_at',{ascending:false}).limit(30)
   ]);
   if(!mounted)return;
   setUnread(typeof chatCount==='number'?chatCount:0);
   if(!repliesError)setFeedbackReplies((replies||[]).filter(r=>r.admin_reply?.trim()) as FeedbackReplyAlert[]);
  };
  void load();
  const id=window.setInterval(()=>{if(document.visibilityState==='visible')void load()},17000);
  const onVisibility=()=>{if(document.visibilityState==='visible')void load();};
  document.addEventListener('visibilitychange',onVisibility);
  return ()=>{mounted=false;window.clearInterval(id);document.removeEventListener('visibilitychange',onVisibility)};
 },[route,sb]);
 async function openReply(id:string){
  if(reading)return;
  setReading(id);
  const {data,error}=await sb.rpc('aeromind_feedback_mark_reply_read',{p_feedback_id:id});
  setReading(null);
  if(error||data!==true)return;
  setFeedbackReplies(prev=>prev.map(r=>r.id===id?{...r,reply_read_at:new Date().toISOString()}:r));
  setOpen(false);
  router.push('/feedback#resposta-'+id);
  router.refresh();
 }
 function toggleChat(){
  if(!open&&feedbackUnread>0)setActiveTab('feedback');
  setOpen(v=>!v);
 }
 if(route?.startsWith('/admin')||route==='/suporte')return null;
 return <div className="sc-floating-root">
  {open&&<section className="sc-floating-panel" aria-label="Central de suporte e respostas AeroMind">
   <div className="sc-chat-header"><span><b>✦ Central AeroMind</b><small>Suporte e respostas da nossa equipe</small></span>
    <button onClick={()=>setOpen(false)} aria-label="Fechar central de suporte">×</button>
   </div>
   <div className="sc-hub-tabs" role="group" aria-label="Tipo de mensagem">
    <button type="button" className={activeTab==='chat'?'active':''} aria-pressed={activeTab==='chat'} onClick={()=>setActiveTab('chat')}>
     Suporte {unread>0&&<span className="sc-tab-count">{unread>99?'99+':unread}</span>}
    </button>
    <button type="button" className={activeTab==='feedback'?'active':''} aria-pressed={activeTab==='feedback'} onClick={()=>setActiveTab('feedback')}>
     Respostas {feedbackUnread>0&&<span className="sc-tab-count">{feedbackUnread>99?'99+':feedbackUnread}</span>}
    </button>
   </div>
   {activeTab==='chat'?<SupportChatPanel embedded/>:<div className="sc-feedback-replies">
    <p className="sc-feedback-description">Veja aqui quando a equipe responder às suas sugestões de melhoria.</p>
    {feedbackReplies.length?feedbackReplies.map(reply=><article className={'sc-feedback-reply'+(!reply.reply_read_at?' is-new':'')} key={reply.id}>
     <div className="sc-feedback-reply-heading"><strong>{reply.title}</strong>
      {!reply.reply_read_at&&<span className="sc-feedback-new">Nova resposta</span>}
     </div>
     <p className="sc-feedback-answer">{reply.admin_reply}</p>
     <button type="button" disabled={reading===reply.id} onClick={()=>void openReply(reply.id)}>
      {reading===reply.id?'Abrindo...':'Ver no histórico de sugestões ↗'}
     </button>
    </article>):<div className="sc-feedback-empty">Ainda não há respostas às suas sugestões. Quando a equipe responder, a mensagem aparecerá aqui.</div>}
    <Link href="/feedback" onClick={()=>setOpen(false)} className="sc-feedback-all">Ver minhas sugestões →</Link>
   </div>}
  </section>}
  <button type="button" className={'sc-launcher'+(combinedUnread>0&&!open?' has-unread':'')} onClick={toggleChat}
   aria-label={open?'Fechar central de suporte':combinedUnread>0?'Abrir suporte: '+combinedUnread+' mensagens novas':'Abrir chat do suporte'} aria-expanded={open}>
   <span aria-hidden="true">{open?'×':<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 11.5a8.2 8.2 0 0 1-8.5 8.1 9.6 9.6 0 0 1-3.7-.8L3 20l1.3-4A8 8 0 0 1 3.5 11.5a8.5 8.5 0 0 1 17 0Z"/><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"/></svg>}</span> <span>{open?'Fechar':'Suporte'}</span>
   {!open&&combinedUnread>0&&<b className="sc-unread">{combinedUnread>99?'99+':combinedUnread}</b>}
  </button>
 </div>;
}
