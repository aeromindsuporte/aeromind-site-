'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function signedIn(){const sb=await createClient();const {data:{user},error}=await sb.auth.getUser();if(error||!user)redirect('/entrar?next=%2Fnotificacoes');return {sb,user};}
export async function markUserNotificationRead(form:FormData){
 const {sb,user}=await signedIn();const id=form.get('id');
 if(typeof id!=='string'||!uuid.test(id))redirect('/notificacoes?erro=dados');
 const {data,error}=await sb.rpc('aeromind_mark_notification_read',{p_delivery_id:id});
 if(error||data!==true)redirect('/notificacoes?erro=salvar');
 revalidatePath('/notificacoes');revalidatePath('/minha-conta');redirect('/notificacoes');
}
export async function markAllUserNotificationsRead(){
 const {sb,user}=await signedIn();
 const {error}=await sb.from('aeromind_notification_deliveries').update({read_at:new Date().toISOString()}).eq('user_id',user.id).is('read_at',null);
 if(error)redirect('/notificacoes?erro=salvar');
 revalidatePath('/notificacoes');revalidatePath('/minha-conta');redirect('/notificacoes');
}
