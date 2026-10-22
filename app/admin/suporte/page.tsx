import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {replyAsStaff,changeSupportStatus} from '@/app/suporte/actions';
import {CommercialAdminShell} from '@/components/admin/CommercialAdminShell';
import '../admin.css';
export const dynamic='force-dynamic';
export default async function SupportAdmin({searchParams}:{searchParams:Promise<{ticket?:string;erro?:string}>}){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar?next=%2Fadmin%2Fsuporte');
 const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();if(!staff)redirect('/minha-conta');
 const {ticket,erro}=await searchParams;
 const {data:items,error:itemsError}=await sb.from('aeromind_support_tickets').select('id,user_id,subject,category,status,created_at').order('created_at',{ascending:false}).limit(100);
 const current=items?.find(t=>t.id===ticket);
 const {data:messages}=current?await sb.from('aeromind_support_messages').select('id,author_id,content,created_at').eq('ticket_id',current.id).order('created_at',{ascending:true}).limit(200):{data:[]};
 return <CommercialAdminShell title="Central de suporte" active="/admin/suporte" description="Atenda clientes, acompanhe solicitações e encerre casos resolvidos.">{erro&&<p className="admin-feedback bad">Não foi possível concluir a operação.</p>}<div className="admin-main-grid"><section className="admin-card"><h2>Fila de solicitações</h2>{itemsError&&<p role="alert" className="admin-feedback bad">Não foi possível consultar os chamados. Tente novamente.</p>}{items?.length?items.map(t=><p key={t.id}><Link className="admin-inline-action" href={'/admin/suporte?ticket='+t.id}>{t.subject} · {t.status==='resolved'?'Resolvido':t.status==='open'?'Aberto':'Em atendimento'}</Link><span> · <Link href={'/admin/cliente/'+t.user_id}>Cliente ↗</Link></span></p>):!itemsError?<p>Nenhuma solicitação.</p>:null}</section><section className="admin-card">{current?<><h2>{current.subject}</h2><form action={changeSupportStatus}><input type="hidden" name="ticket" value={current.id}/><select name="status" defaultValue={current.status}><option value="open">Aberto</option><option value="in_progress">Em atendimento</option><option value="resolved">Resolvido</option></select><button className="admin-inline-action">Salvar situação</button></form>{messages?.map(m=><article key={m.id} style={{borderBottom:'1px solid #354277',padding:'12px 0'}}><small>{new Date(m.created_at).toLocaleString('pt-BR')}</small><p style={{whiteSpace:'pre-wrap'}}>{m.content}</p></article>)}<form action={replyAsStaff} className="admin-edit-grid"><input type="hidden" name="ticket" value={current.id}/><label className="admin-full">Responder<textarea rows={4} name="message" minLength={2} maxLength={3000} required/></label><div className="admin-form-foot"><button>Responder cliente</button></div></form></>:<p>Escolha um chamado para visualizar a conversa.</p>}</section></div></CommercialAdminShell>;
}
