'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function revokeMyDevice(formData:FormData){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/entrar?next=%2Fdispositivos');
  const id=formData.get('device_id');
  if(typeof id!=='string'|| !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)){
    redirect('/dispositivos?status=invalid');
  }
  const {data,error}=await supabase.rpc('aeromind_revoke_device',{p_device_id:id});
  if(error||data!==true) redirect('/dispositivos?status=failed');
  revalidatePath('/dispositivos');
  revalidatePath('/minha-conta');
  redirect('/dispositivos?status=revoked');
}

export async function approveMyDevice(formData:FormData){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/entrar?next=%2Fdispositivos');
  const id=formData.get('device_id');
  if(typeof id!=='string'|| !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)){
    redirect('/dispositivos?status=invalid');
  }
  const {data,error}=await supabase.rpc('aeromind_approve_device',{p_device_id:id});
  if(error||data!==true) redirect('/dispositivos?status=approve-failed');
  revalidatePath('/dispositivos');
  redirect('/dispositivos?status=approved');
}
