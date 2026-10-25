'use server';
import {createClient} from '@/lib/supabase/server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
const uuid=(x:unknown)=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
async function session(){
 const sb=await createClient();const {data:{user},error}=await sb.auth.getUser();
 if(error||!user)redirect('/entrar?next=%2Fsuporte');
 return sb;
}
/** Legacy form actions remain compatible with the chat RPC; no direct table writes. */
export async function createSupportTicket(data:FormData){
 const sb=await session();
 const subject=String(data.get('subject')||'Atendimento AeroMind').trim().slice(0,140);
 const message=String(data.get('message')||'').trim().slice(0,3000);
 const {data:result,error}=await sb.rpc('aeromind_support_chat_send',{
  p_ticket_id:null,p_message:message,p_subject:subject
 });
 if(error||!result?.ok)redirect('/suporte?erro=criar');
 revalidatePath('/admin/suporte');redirect('/suporte?ticket='+result.ticket_id);
}
export async function sendSupportMessage(data:FormData){
 const sb=await session(),id=data.get('ticket');
 if(!uuid(id))redirect('/suporte?erro=dados');
 const {error}=await sb.rpc('aeromind_support_chat_send',{
  p_ticket_id:id,p_message:String(data.get('message')||'').trim(),p_subject:'Atendimento AeroMind'
 });
 if(error)redirect('/suporte?ticket='+id+'&erro=enviar');
 revalidatePath('/admin/suporte');redirect('/suporte?ticket='+id);
}
export async function replyAsStaff(data:FormData){
 const sb=await session(),id=data.get('ticket');
 if(!uuid(id))redirect('/admin/suporte?erro=dados');
 const {error}=await sb.rpc('aeromind_support_chat_send',{
  p_ticket_id:id,p_message:String(data.get('message')||'').trim(),p_subject:'Atendimento AeroMind'
 });
 if(error)redirect('/admin/suporte?ticket='+id+'&erro=enviar');
 revalidatePath('/admin/suporte');redirect('/admin/suporte?ticket='+id);
}
export async function changeSupportStatus(data:FormData){
 const sb=await session(),id=data.get('ticket');
 if(!uuid(id))redirect('/admin/suporte?erro=dados');
 const {data:ok,error}=await sb.rpc('aeromind_support_chat_set_status',{
  p_ticket_id:id,p_status:String(data.get('status')||'')
 });
 if(error||ok!==true)redirect('/admin/suporte?ticket='+id+'&erro=status');
 revalidatePath('/admin/suporte');redirect('/admin/suporte?ticket='+id);
}
