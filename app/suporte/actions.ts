'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
const uuid=(x:unknown)=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(x);
export async function createSupportTicket(data:FormData){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar?next=%2Fsuporte');
 const subject=String(data.get('subject')||'').trim().slice(0,140),text=String(data.get('message')||'').trim().slice(0,3000),category=String(data.get('category')||'geral');
 if(subject.length<5||text.length<2||!['geral','acesso','licenca','instalacao','pagamento','dispositivo'].includes(category))redirect('/suporte?erro=dados');
 const {data:ticket,error}=await sb.from('aeromind_support_tickets').insert({user_id:user.id,subject,category}).select('id').single();
 if(error||!ticket)redirect('/suporte?erro=criar');
 const {error:msgError}=await sb.from('aeromind_support_messages').insert({ticket_id:ticket.id,author_id:user.id,content:text});
 if(msgError)redirect('/suporte?erro=mensagem');revalidatePath('/suporte');redirect('/suporte?ticket='+ticket.id);
}
export async function sendSupportMessage(data:FormData){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar?next=%2Fsuporte');
 const id=data.get('ticket'),content=String(data.get('message')||'').trim().slice(0,3000);
 if(!uuid(id)||content.length<2)redirect('/suporte?erro=dados');
 const {error}=await sb.from('aeromind_support_messages').insert({ticket_id:id,author_id:user.id,content});
 if(error)redirect('/suporte?ticket='+id+'&erro=enviar');
 revalidatePath('/suporte');revalidatePath('/admin/suporte');redirect('/suporte?ticket='+id);
}
export async function replyAsStaff(data:FormData){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar?next=%2Fadmin%2Fsuporte');
 const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();if(!staff)redirect('/minha-conta');
 const id=data.get('ticket'),message=String(data.get('message')||'').trim().slice(0,3000);
 if(!uuid(id)||message.length<2)redirect('/admin/suporte?erro=dados');
 const {error}=await sb.from('aeromind_support_messages').insert({ticket_id:id,author_id:user.id,content:message});
 if(error)redirect('/admin/suporte?ticket='+id+'&erro=enviar');
 const {error:statusError}=await sb.from('aeromind_support_tickets').update({status:'in_progress',updated_at:new Date().toISOString()}).eq('id',id);
 if(statusError)redirect('/admin/suporte?ticket='+id+'&erro=status');
 revalidatePath('/suporte');revalidatePath('/admin/suporte');redirect('/admin/suporte?ticket='+id);
}
export async function changeSupportStatus(data:FormData){
 const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar');
 const {data:staff}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();if(!staff)redirect('/minha-conta');
 const id=data.get('ticket'),status=String(data.get('status')||'');if(!uuid(id)||!['open','in_progress','resolved'].includes(status))redirect('/admin/suporte');
 const {error:statusError}=await sb.from('aeromind_support_tickets').update({status,updated_at:new Date().toISOString()}).eq('id',id);
 if(statusError)redirect('/admin/suporte?ticket='+id+'&erro=status');
 revalidatePath('/admin/suporte');redirect('/admin/suporte?ticket='+id);
}
