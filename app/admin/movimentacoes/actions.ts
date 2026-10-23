'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';

export async function markDeviceEventSeen(form:FormData){
 const {sb}=await requireAdmin();
 const raw=form.get('event_id');
 const id=typeof raw==='string'&&/^\d{1,18}$/.test(raw)?Number(raw):NaN;
 if(!Number.isSafeInteger(id)||id<=0)redirect('/admin/movimentacoes?msg=invalid');
 const {data,error}=await sb.rpc('aeromind_mark_device_event_seen',{p_event_id:id});
 if(error||data!==true)redirect('/admin/movimentacoes?msg=error');
 revalidatePath('/admin/movimentacoes');
 revalidatePath('/admin/dispositivos');
 redirect('/admin/movimentacoes?msg=reviewed');
}
