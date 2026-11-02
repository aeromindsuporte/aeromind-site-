'use client';
import {useState} from 'react';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/browser';

export type FeedbackItem={
 id:string;user_id:string;category:string;title:string;message:string;rating:number|null;
 status:string;admin_reply:string|null;created_at:string;updated_at:string;
};
const types=[
 {id:'melhoria',icon:'✦',label:'Tenho uma ideia',desc:'Uma função ou melhoria que você gostaria de ver'},
 {id:'problema',icon:'⚙',label:'Encontrei algo',desc:'Conte o que podemos corrigir ou simplificar'},
 {id:'elogio',icon:'♥',label:'Quero elogiar',desc:'O que está funcionando bem para você?'},
 {id:'outro',icon:'✎',label:'Outra opinião',desc:'Sua experiência também importa'}
] as const;
export const feedbackStatusLabel:Record<string,string>={
 novo:'Recebida',em_analise:'Em análise',planejado:'No planejamento',
 implementado:'Implementada',arquivado:'Concluída'
};
const date=(d:string)=>new Date(d).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'short',year:'numeric'});
export function FeedbackForm({initial,userId}:{initial:FeedbackItem[],userId:string}){
 const [items,setItems]=useState(initial);
 const [category,setCategory]=useState('melhoria');
 const [title,setTitle]=useState('');
 const [message,setMessage]=useState('');
 const [rating,setRating]=useState<number|null>(null);
 const [submitting,setSubmitting]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState(false);
 const [seeHistory,setSeeHistory]=useState(initial.length>0);
 async function send(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(submitting)return;
  setError('');setSuccess(false);
  const t=title.trim(),body=message.trim();
  if(t.length<5||t.length>110||body.length<15||body.length>2000){setError('Escreva um título de pelo menos 5 caracteres e uma mensagem de pelo menos 15.');return;}
  setSubmitting(true);
  try{
   const sb=createClient();
   const {data:{user},error:authError}=await sb.auth.getUser();
   if(authError||!user||user.id!==userId){setError('Sua sessão expirou. Entre novamente na conta para enviar.');return;}
   const {data,error:saveError}=await sb.from('aeromind_feedback').insert({
    user_id:user.id,category,title:t,message:body,rating
   }).select('id,user_id,category,title,message,rating,status,admin_reply,created_at,updated_at').single();
   if(saveError||!data){
    const text=saveError?.message||'Não foi possível salvar.';
    setError(/60 seconds|um minuto/i.test(text)?'Aguarde um minuto antes de enviar outra contribuição.':
     /cinco|five|24 hours|por dia/i.test(text)?'Você atingiu o limite de 5 contribuições nas últimas 24 horas.':
     'Não foi possível enviar agora. Confira a conexão e tente novamente.');
    return;
   }
   setItems(prev=>[data as FeedbackItem,...prev]);setSuccess(true);
   setSeeHistory(true);setMessage('');setTitle('');setRating(null);
  }catch{setError('A conexão foi interrompida. Tente novamente.');}
  finally{setSubmitting(false);}
 }
 return <div className="fb-wrap">
  <section className="fb-intro" aria-label="Sua opinião constrói o AeroMind">
   <span className="fb-kicker">✦ ESPAÇO DA COMUNIDADE AEROMIND</span>
   <h1>Sua opinião pode virar <em>a próxima novidade.</em></h1>
   <p>Qual função facilitaria seu dia? O que podemos melhorar? A equipe lê as contribuições para decidir o que evoluir no AeroMind. <strong>Queremos ouvir você!</strong></p>
   <div className="fb-promise"><span>✧ Leva poucos minutos</span><span>◉ Enviado direto para a equipe</span><span>↗ Acompanhe a resposta</span></div>
  </section>
  <div className="fb-content">
   <section className="fb-form-card" aria-labelledby="fb-form-title">
    <header><div><span className="fb-kicker">PARTICIPE DA EVOLUÇÃO</span><h2 id="fb-form-title">O que você gostaria de compartilhar?</h2></div><span className="fb-heart" aria-hidden="true">♥</span></header>
    <form onSubmit={send}>
     <fieldset className="fb-options"><legend>Escolha o tipo de mensagem</legend>
      <div className="fb-type-grid">{types.map(t=><button key={t.id} type="button"
       aria-pressed={category===t.id} className={'fb-type'+(category===t.id?' selected':'')}
       onClick={()=>setCategory(t.id)}>
       <span aria-hidden="true" className="fb-type-icon">{t.icon}</span>
       <b>{t.label}</b><small>{t.desc}</small>
      </button>)}</div>
     </fieldset>
     <label className="fb-field">Dê um título à sua ideia
      <input type="text" required minLength={5} maxLength={110} autoComplete="off"
       placeholder="Ex.: gostaria de filtrar o histórico por horário"
       value={title} onChange={e=>setTitle(e.target.value)}/>
     </label>
     <label className="fb-field">Conte um pouco mais
      <textarea rows={5} required minLength={15} maxLength={2000}
       placeholder="Como funcionaria? O que ajudaria você a aproveitar melhor o AeroMind?"
       value={message} onChange={e=>setMessage(e.target.value)}/>
      <small>{message.length}/2000 caracteres</small>
     </label>
     <fieldset className="fb-rating"><legend>Como está sua experiência até agora? <span>(opcional)</span></legend>
      <div role="group" aria-label="Nota de experiência de 1 a 5">
       {[1,2,3,4,5].map(n=><button key={n} type="button" aria-pressed={rating===n}
        aria-label={n+' de 5'} onClick={()=>setRating(prev=>prev===n?null:n)}
        className={rating===n?'active':''}>{n} <span aria-hidden="true">★</span></button>)}
      </div>
     </fieldset>
     {error&&<p className="fb-alert bad" role="alert">{error}</p>}
     {success&&<p className="fb-alert good" role="status">✓ Obrigado por contribuir! Sua mensagem foi recebida e já aparece no histórico abaixo.</p>}
     <button className="fb-submit" type="submit" disabled={submitting}>
      {submitting?'Enviando sua contribuição...':'✦ Enviar minha sugestão'} <span aria-hidden="true">↗</span>
     </button>
     <p className="fb-privacy">🔒 Suas mensagens não são publicadas para outros usuários. Apenas você e a equipe AeroMind podem vê-las. Para dúvidas urgentes, use o <Link href="/suporte">suporte</Link>.</p>
    </form>
   </section>
   <aside className="fb-history" aria-label="Acompanhar minhas contribuições">
    <div className="fb-history-head"><span className="fb-kicker">ACOMPANHAMENTO</span><h2>Minhas contribuições</h2><p>Acompanhe suas ideias e as respostas da nossa equipe.</p></div>
    <button type="button" className="fb-history-toggle" aria-expanded={seeHistory} onClick={()=>setSeeHistory(v=>!v)}>{seeHistory?'Ocultar histórico':'Ver histórico'} <b>{items.length}</b></button>
    {seeHistory&&(items.length?<div className="fb-history-list">{items.map(x=><article className="fb-history-item" key={x.id}>
     <div className="fb-history-top"><span className={'fb-status status-'+x.status}>{feedbackStatusLabel[x.status]||'Recebida'}</span><time dateTime={x.created_at}>{date(x.created_at)}</time></div>
     <h3>{x.title}</h3>
     <p>{x.message}</p>
     {x.admin_reply&&<div className="fb-admin-reply"><b>✦ Resposta da equipe</b><p>{x.admin_reply}</p></div>}
    </article>)}</div>:<p className="fb-history-empty">Sua primeira contribuição poderá aparecer aqui. Toda ideia começa com uma conversa. ✦</p>)}
    <div className="fb-nudge"><span aria-hidden="true">💡</span><strong>Não existe ideia pequena!</strong><p>Às vezes, um detalhe que você percebe pode melhorar a experiência de muitas pessoas.</p></div>
   </aside>
  </div>
 </div>;
}
