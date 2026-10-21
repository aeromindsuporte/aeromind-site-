'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function adminClient() {
  const supabase=await createClient();
  const { data:{user} }=await supabase.auth.getUser();
  if (!user) redirect('/entrar?next=%2Fadmin');
  const {data:staff,error}=await supabase.from('aeromind_staff').select('role').eq('user_id',user.id).maybeSingle();
  if (error || !staff) redirect('/minha-conta');
  return supabase;
}

const word=(entry:FormDataEntryValue|null)=> typeof entry==='string'?entry.trim():'';

export async function saveLicense(formData:FormData) {
  const supabase=await adminClient();
  const email=word(formData.get('email')).toLowerCase();
  const tier=word(formData.get('tier'));
  const status=word(formData.get('status'));
  const expires=word(formData.get('valid_until'));
  const note=word(formData.get('note')).slice(0,500);
  const tiers=['Básico','Pro','Ultra'];
  const statuses=['pending','active','expired','suspended','revoked'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>320 || !tiers.includes(tier) || !statuses.includes(status)) {
    redirect('/admin?msg=invalid#editar-licenca');
  }
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) redirect('/admin?msg=invalid#editar-licenca');
  const expiry=expires?new Date(expires+'T23:59:59-03:00'):null;
  if (expiry && Number.isNaN(expiry.getTime())) redirect('/admin?msg=invalid#editar-licenca');
  if (status==='active' && (!expiry || expiry.getTime()<=Date.now())) {
    redirect('/admin?msg=expiry#editar-licenca');
  }
  const {error}=await supabase.rpc('aeromind_manage_license',{
    p_customer_email:email,
    p_plan_name:tier,
    p_status:status,
    p_valid_until:expiry?.toISOString()??null,
    p_note:note||null,
  });
  if(error) {
    // Avoid exposing raw SQL/provider details in user-visible URLs.
    redirect('/admin?msg=license-error#editar-licenca');
  }
  revalidatePath('/admin');
  revalidatePath('/minha-conta');
  const customer=word(formData.get('customer_id'));
  if(/^[0-9a-f-]{36}$/i.test(customer))redirect('/admin/cliente/'+customer+'?msg=license-saved');
  redirect('/admin/licencas?msg=license-saved');
}

export async function saveCatalogPlan(formData:FormData) {
  const supabase=await adminClient();
  const slug=word(formData.get('slug'));
  const priceRaw=word(formData.get('price')).replace(',','.');
  const visible=formData.get('visible')==='on';
  if (!/^(basico|pro|ultra)-(mensal|trimestral|semestral|anual)$/.test(slug)) redirect('/admin/planos?msg=invalid');
  const amount=priceRaw ? Number(priceRaw) : null;
  if (amount!==null && (!Number.isFinite(amount)||amount<0||amount>1000000)) redirect('/admin/planos?msg=invalid');
  const cents=amount===null?null:Math.round(amount*100);
  if (visible && (cents===null||cents===0)) redirect('/admin/planos?msg=price');
  const {data,error}=await supabase.rpc('aeromind_update_catalog_plan',{
    p_slug:slug,p_price_cents:cents,p_visible:visible
  });
  if(error||data!==true) redirect('/admin/planos?msg=plan-error');
  revalidatePath('/admin');
  revalidatePath('/planos');
  revalidatePath('/');
  revalidatePath('/checkout');
  revalidatePath('/admin/planos');
  redirect('/admin/planos?msg=plan-saved');
}

export async function revokeAdminDevice(formData:FormData){
  const supabase=await adminClient();
  const id=word(formData.get('device_id'));
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)){
    redirect('/admin?msg=device-error#dispositivos');
  }
  const {data,error}=await supabase.rpc('aeromind_admin_revoke_device',{p_device_id:id});
  if(error||data!==true)redirect('/admin?msg=device-error#dispositivos');
  revalidatePath('/admin');
  revalidatePath('/dispositivos');
  const customer=word(formData.get('customer_id'));
  if(/^[0-9a-f-]{36}$/i.test(customer))redirect('/admin/cliente/'+customer+'?msg=device-revoked');
  redirect('/admin/dispositivos?msg=device-revoked');
}

export async function saveDeviceLimit(formData:FormData) {
 const supabase=await adminClient();
 const email=word(formData.get('email')).toLowerCase();
 const limit=Number(word(formData.get('max_devices')));
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!Number.isInteger(limit)||limit<1||limit>20)redirect('/admin/licencas?msg=invalid');
 const {data,error}=await supabase.rpc('aeromind_set_device_limit',{p_customer_email:email,p_max_devices:limit});
 if(error||data!==true)redirect('/admin/licencas?msg=license-error');
 revalidatePath('/admin');
 revalidatePath('/dispositivos');
 revalidatePath('/minha-conta');
 const customer=word(formData.get('customer_id'));
 if(/^[0-9a-f-]{36}$/i.test(customer))redirect('/admin/cliente/'+customer+'?msg=limit-saved');
 redirect('/admin/licencas?msg=limit-saved');
}

// Personalização da publicidade: RPC autenticado e restrito a administradores.
export async function savePlanPresentation(formData:FormData){
 const sb=await adminClient(),slug=word(formData.get('slug'));
 const title=word(formData.get('title')),description=word(formData.get('description')),badge=word(formData.get('badge')),cta=word(formData.get('cta'));
 const features=word(formData.get('features')).split('\n').map(x=>x.trim()).filter(Boolean);
 if(!/^((basico|pro|ultra)-(mensal|trimestral|semestral|anual)|teste-(horas|dias))$/.test(slug)||title.length>65||description.length>240||badge.length>38||cta.length>40||features.length>8||features.some(x=>x.length>115))redirect('/admin/planos?msg=invalid');
 const {data,error}=await sb.rpc('aeromind_save_plan_presentation',{p_slug:slug,p_title:title,p_description:description,p_badge:badge,p_features:features,p_cta:cta,p_highlight:formData.get('highlight')==='on'});
 if(error||data!==true)redirect('/admin/planos?msg=plan-error');
 revalidatePath('/planos');revalidatePath('/');revalidatePath('/checkout');revalidatePath('/admin/planos');redirect('/admin/planos?msg=plan-saved');
}
export async function saveCoupon(formData:FormData){
 const sb=await adminClient(),code=word(formData.get('code')).toUpperCase(),discount=Number(word(formData.get('discount')));
 const raw=word(formData.get('max_uses')),max=raw?Number(raw):null,date=word(formData.get('expires_at'));
 const expiry=date?new Date(date+'T23:59:59-03:00'):null;
 if(!/^[A-Z0-9_-]{4,24}$/.test(code)||!Number.isInteger(discount)||discount<1||discount>90||(max!==null&&(!Number.isInteger(max)||max<1||max>100000))||(expiry&&(Number.isNaN(expiry.getTime())||expiry.getTime()<=Date.now())))redirect('/admin/cupons?msg=invalid');
 const {error}=await sb.from('aeromind_coupons').upsert({code,discount_percent:discount,max_uses:max,expires_at:expiry?.toISOString()||null,active:formData.get('active')==='on',updated_at:new Date().toISOString()},{onConflict:'code'});
 if(error)redirect('/admin/cupons?msg=coupon-error');
 revalidatePath('/admin/cupons');redirect('/admin/cupons?msg=coupon-saved');
}
export async function toggleCoupon(formData:FormData){
 const sb=await adminClient(),code=word(formData.get('code'));
 if(!/^[A-Z0-9_-]{4,24}$/.test(code))redirect('/admin/cupons?msg=invalid');
 const {error}=await sb.from('aeromind_coupons').update({active:word(formData.get('active'))==='true',updated_at:new Date().toISOString()}).eq('code',code);
 if(error)redirect('/admin/cupons?msg=coupon-error');
 revalidatePath('/admin/cupons');redirect('/admin/cupons?msg=coupon-saved');
}

// Duração e preço dos dois planos de teste são gerenciados separadamente.
// Pedidos já criados preservam a duração e o preço registrados na compra.
export async function saveTrialPlan(formData:FormData){
 const sb=await adminClient();
 const slug=word(formData.get('slug'));
 const raw=word(formData.get('price')).replace(',','.');
 const amount=raw?Number(raw):null;
 const quantity=Number(word(formData.get('quantity')));
 const visible=formData.get('visible')==='on';
 if(!['teste-horas','teste-dias'].includes(slug)||!Number.isInteger(quantity)||quantity<1||
   quantity>(slug==='teste-horas'?72:30)||
   (amount!==null&&(!Number.isFinite(amount)||amount<0||amount>1000000))){
  redirect('/admin/planos?msg=invalid');
 }
 const cents=amount===null?null:Math.round(amount*100);
 if(visible&&(!cents||cents<1))redirect('/admin/planos?msg=price');
 const {data,error}=await sb.rpc('aeromind_save_trial_plan',{
  p_slug:slug,p_price_cents:cents,p_quantity:quantity,p_visible:visible,
 });
 if(error||data!==true)redirect('/admin/planos?msg=plan-error');
 revalidatePath('/');revalidatePath('/planos');revalidatePath('/checkout');revalidatePath('/admin/planos');
 redirect('/admin/planos?msg=plan-saved');
}


// Editor unificado: preço, duração, publicação e conteúdo comercial
// são persistidos em uma transação atômica pelo Supabase.
export async function savePlanEditor(formData:FormData){
 const sb=await adminClient();
 const slug=word(formData.get('slug'));
 if(!/^((basico|pro|ultra)-(mensal|trimestral|semestral|anual)|teste-(horas|dias))$/.test(slug)){
  redirect('/admin/planos?msg=invalid');
 }
 const rawPrice=word(formData.get('price')).replace(',','.');
 const price=rawPrice===''?null:Number(rawPrice);
 const cents=price===null?null:Math.round(price*100);
 const visible=formData.get('visible')==='on';
 const rawQuantity=word(formData.get('quantity'));
 const isTrial=slug==='teste-horas'||slug==='teste-dias';
 const quantity=isTrial?Number(rawQuantity):null;
 const title=word(formData.get('title'));
 const description=word(formData.get('description'));
 const badge=word(formData.get('badge'));
 const cta=word(formData.get('cta'));
 const features=word(formData.get('features')).split('\n').map(x=>x.trim()).filter(Boolean);
 const durationCaption=word(formData.get('duration_caption'));
 const unpricedLabel=word(formData.get('unpriced_label'));
 if((price!==null&&(!Number.isFinite(price)||price<0||price>1000000||
  Math.abs(price*100-Math.round(price*100))>0.001))||
  (visible&&(cents===null||cents<200))||
  (isTrial&&(!Number.isInteger(quantity)||quantity===null||quantity<1||
    quantity>(slug==='teste-horas'?72:30)))||
  title.length>65||description.length>240||badge.length>38||cta.length>40||durationCaption.length>80||unpricedLabel.length>40||
  features.length>8||features.some(f=>f.length>115)){
   redirect('/admin/planos?msg=invalid&editar='+encodeURIComponent(slug));
 }
 const {data,error}=await sb.rpc('aeromind_save_plan_editor_v2',{
  p_slug:slug,p_price_cents:cents,p_visible:visible,p_trial_quantity:quantity,
  p_title:title,p_description:description,p_badge:badge,p_features:features,
  p_cta:cta,p_highlight:formData.get('highlight')==='on',
  p_duration_caption:durationCaption,p_unpriced_label:unpricedLabel
 });
 if(error||data!==true)redirect('/admin/planos?msg=plan-error&editar='+encodeURIComponent(slug));
 revalidatePath('/admin/planos');revalidatePath('/');revalidatePath('/planos');revalidatePath('/checkout');
 redirect('/admin/planos?msg=plan-saved&editar='+encodeURIComponent(slug));
}
export async function toggleCatalogPlan(formData:FormData){
 const sb=await adminClient(),slug=word(formData.get('slug'));
 const next=word(formData.get('visible'))==='true';
 if(!/^((basico|pro|ultra)-(mensal|trimestral|semestral|anual)|teste-(horas|dias))$/.test(slug))
  redirect('/admin/planos?msg=invalid');
 const {data,error}=await sb.rpc('aeromind_admin_all_plans');
 const plan=(Array.isArray(data)?data:[]).find((p:{slug:string})=>p.slug===slug);
 if(error||!plan)redirect('/admin/planos?msg=plan-error');
 if(next&&(!Number.isInteger(plan.price_cents)||plan.price_cents<200))
  redirect('/admin/planos?msg=price&editar='+encodeURIComponent(slug));
 const {data:updated,error:saveError}=await sb.rpc('aeromind_save_plan_editor_v2',{
  p_slug:slug,p_price_cents:plan.price_cents,p_visible:next,
  p_trial_quantity:plan.slug==='teste-horas'||plan.slug==='teste-dias'?plan.trial_quantity:null,
  p_title:plan.marketing_title||'',p_description:plan.marketing_description||'',
  p_badge:plan.marketing_badge||'',p_features:plan.marketing_features||[],
  p_cta:plan.marketing_cta||'',p_highlight:!!plan.marketing_highlight,
  p_duration_caption:plan.marketing_duration_caption||'',p_unpriced_label:plan.marketing_unpriced_label||''
 });
 if(saveError||updated!==true)redirect('/admin/planos?msg=plan-error');
 revalidatePath('/admin/planos');revalidatePath('/');revalidatePath('/planos');revalidatePath('/checkout');
 redirect('/admin/planos?msg=plan-saved');
}
