'use client';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
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

export function SupportFloatingChat(){
 const route=usePathname();const [open,setOpen]=useState(false),[unread,setUnread]=useState(0);
 const sb=useMemo(()=>createClient(),[]);
 useEffect(()=>{
  if(route?.startsWith('/admin')||route==='/suporte')return;
  let mounted=true;
  const load=async()=>{
   const {data:{user}}=await sb.auth.getUser();
   if(!user){if(mounted)setUnread(0);return}
   const {data}=await sb.rpc('aeromind_support_chat_unread_count');
   if(mounted)setUnread(typeof data==='number'?data:0);
  };
  void load();const id=window.setInterval(()=>{if(!open&&document.visibilityState==='visible')void load()},17000);
  return ()=>{mounted=false;window.clearInterval(id)};
 },[route,sb,open]);
 if(route?.startsWith('/admin')||route==='/suporte')return null;
 return <div className="sc-floating-root">
  {open&&<section className="sc-floating-panel" aria-label="Chat com suporte AeroMind">
   <div className="sc-chat-header"><span><b>✦ Suporte AeroMind</b><small>Atendimento pela equipe · respostas aqui</small></span>
    <button onClick={()=>setOpen(false)} aria-label="Fechar chat">×</button>
   </div>
   <SupportChatPanel embedded/>
  </section>}
  <button type="button" className="sc-launcher" onClick={()=>setOpen(x=>!x)}
   aria-label={open?'Fechar suporte':'Abrir chat do suporte'} aria-expanded={open}>
   <span aria-hidden="true">{open?'×':'☏'}</span> <span>{open?'Fechar':'Suporte'}</span>
   {!open&&unread>0&&<b className="sc-unread">{unread>99?'99+':unread}</b>}
  </button>
 </div>;
}
