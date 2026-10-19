'use server';
import {revalidatePath} from 'next/cache';import {redirect} from 'next/navigation';import {createClient} from '@/lib/supabase/server';
async function requireAdmin(){const sb=await createClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect('/entrar?next=%2Fadmin%2Fcupons');const {data:staff,error}=await sb.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();if(error||!staff)redirect('/minha-conta');return sb;}
export async function saveCoupon(data:FormData){
 const sb=await requireAdmin();const code=String(data.get('code')||'').trim().toUpperCase();
 const discount=Number(data.get('discount_percent'));const maxRaw=String(data.get('max_uses')||'').trim();const max=maxRaw?Number(maxRaw):null;
 const expiresRaw=String(data.get('expires_at')||'').trim();const expires=expiresRaw?new Date(expiresRaw+'T23:59:59-03:00'):null;
 if(!/^[A-Z0-9_-]{4,24}$/.test(code)||!Number.isInteger(discount)||discount<1||discount>90||(max!==null&&(!Number.isInteger(max)||max<1||max>100000))||(expires&&Number.isNaN(expires.getTime())))redirect('/admin/cupons?msg=invalid');
 const {error}=await sb.from('aeromind_coupons').upsert({code,discount_percent:discount,max_uses:max,expires_at:expires?.toISOString()||null,active:data.get('active')==='on',updated_at:new Date().toISOString()},{onConflict:'code'});
 if(error)redirect('/admin/cupons?msg=error');revalidatePath('/admin/cupons');redirect('/admin/cupons?msg=saved');
}
export async function setCouponStatus(data:FormData){
 const sb=await requireAdmin();const code=String(data.get('code')||'');if(!/^[A-Z0-9_-]{4,24}$/.test(code))redirect('/admin/cupons?msg=invalid');
 const active=data.get('active')==='true';const {error}=await sb.from('aeromind_coupons').update({active,updated_at:new Date().toISOString()}).eq('code',code);
 if(error)redirect('/admin/cupons?msg=error');revalidatePath('/admin/cupons');redirect('/admin/cupons?msg=saved');
}