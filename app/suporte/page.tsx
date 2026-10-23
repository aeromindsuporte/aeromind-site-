import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {createSupportTicket,sendSupportMessage} from './actions';
export const dynamic='force-dynamic';
export const metadata={title:'Central de atendimento | AeroMind'};
const date=(s:string)=>new Date(s).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
export default async function Support({searchParams}:{searchParams:Promise<{ticket?:string;erro?:string;categoria?:string;assunto?:string}>}){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar?next=%2Fsuporte');
 const {ticket,erro,categoria,assunto}=await searchParams;
 const deviceDefault=categoria==='dispositivo';
 const subjectDefault=typeof assunto==='string'?assunto.slice(0,140):'';
 const {data:items}=await sb.from('aeromind_support_tickets').select('id,subject,category,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);
 const current=items?.find(x=>x.id===ticket);
 const {data:messages}=current?await sb.from('aeromind_support_messages').select('id,author_id,content,created_at').eq('ticket_id',current.id).order('created_at',{ascending:true}).limit(200):{data:[]};
 return <main className="account-root"><header className="account-header"><Link href="/minha-conta" className="auth-logo">← AeroMind</Link></header><div className="account-container"><span className="auth-eyebrow">SUPORTE AEROMIND</span><h1>Central de <em>atendimento</em></h1><p className="account-lead">Envie sua solicitação e acompanhe as respostas da equipe em um só lugar.</p>{erro&&<p role="alert" className="device-notice error">Não foi possível concluir a operação. Tente novamente.</p>}
 <div className="account-grid"><section className="account-card"><h2>Abrir solicitação</h2><form action={createSupportTicket} className="support-form"><label>Assunto<input name="subject" defaultValue={subjectDefault} required minLength={5} maxLength={140} placeholder="Como podemos ajudar?"/></label><label>Categoria<select name="category" defaultValue={deviceDefault?'dispositivo':'geral'}><option value="geral">Dúvida geral</option><option value="dispositivo">Troca ou revogação de aparelho</option><option value="acesso">Acesso</option><option value="licenca">Licença</option><option value="instalacao">Instalação</option><option value="pagamento">Pagamento</option></select></label><label>Mensagem<textarea name="message" minLength={2} maxLength={3000} rows={4} required placeholder="Explique o que aconteceu"/></label><button className="auth-submit" type="submit">Enviar solicitação →</button></form></section>
 <section className="account-card"><h2>Minhas solicitações</h2>{items?.length?items.map(t=><p key={t.id}><Link href={'/suporte?ticket='+t.id}><strong>{t.subject}</strong> · {t.status==='resolved'?'Resolvido':t.status==='in_progress'?'Em atendimento':'Aberto'}</Link><small style={{display:'block'}}>{date(t.created_at)}</small></p>):<p>Nenhuma solicitação até agora.</p>}</section></div>
 {current&&<section className="account-card" style={{marginTop:18}}><h2>{current.subject}</h2><p>Situação: {current.status==='resolved'?'Resolvido':current.status==='in_progress'?'Em atendimento':'Aberto'}</p>{messages?.map(m=><div key={m.id} style={{padding:14,margin:'10px 0',border:'1px solid #44416f',borderRadius:12}}><b>{m.author_id===user.id?'Você':'Equipe AeroMind'}</b><small style={{display:'block'}}>{date(m.created_at)}</small><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{m.content}</p></div>)}{current.status!=='resolved'&&<form className="support-form" action={sendSupportMessage}><input type="hidden" name="ticket" value={current.id}/><label>Responder<textarea name="message" required minLength={2} maxLength={3000} rows={3}/></label><button className="auth-submit">Enviar resposta</button></form>}</section>}
 </div><style>{'.support-form{display:grid;gap:14px}.support-form label{display:grid;gap:7px}.support-form input,.support-form select,.support-form textarea{padding:13px;color:white;background:#111933;border:1px solid #535a99;border-radius:10px;width:100%;font:inherit}'}</style></main>;
}
