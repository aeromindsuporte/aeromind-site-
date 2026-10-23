'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function markUserNotificationRead(form:FormData){
 const sb=await createClient();
 const {data:{user},error:userError}=await sb.auth.getUser();
 if(userError||!user)redirect('/entrar?next=%2Fnotificacoes');
 const id=form.get('id');
 if(typeof id!=='string'||!uuid.test(id))redirect('/notificacoes?erro=dados');
 const {data,error}=await sb.rpc('aeromind_mark_notification_read',{p_delivery_id:id});
 if(error||data!==true)redirect('/notificacoes?erro=salvar');
 revalidatePath('/notificacoes');
 revalidatePath('/minha-conta');
 redirect('/notificacoes');
}
