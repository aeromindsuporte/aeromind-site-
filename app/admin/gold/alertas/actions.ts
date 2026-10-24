'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fstr=(form:FormData,key:string)=>typeof form.get(key)==='string'?String(form.get(key)).trim():'';
const location=(client:string,msg:string)=>'/admin/gold/alertas?cliente='+encodeURIComponent(client)+'&msg='+encodeURIComponent(msg);
export async function saveGoldPreviewAlertRule(form:FormData){
 const {sb,role}=await requireAdmin();
 if(!['admin','owner'].includes(role))redirect('/admin');
 const client=fstr(form,'cliente'),profile=fstr(form,'profile'),indicator=fstr(form,'indicator');
 const amount=fstr(form,'min_target').replace(',','.'),minutes=fstr(form,'cooldown');
 const reason=fstr(form,'reason'),previewEnabled=form.get('preview_enabled')==='on';
 if(!uuid.test(client)||!['Refinado','Gold'].includes(profile)||
  !['BAIXA','MEDIANA','ALTA'].includes(indicator)||
  !/^\d+(?:\.\d{1,4})?$/.test(amount)||
  !/^\d{1,3}$/.test(minutes)||
  Number(amount)<1||Number(amount)>1000000||Number(minutes)<1||Number(minutes)>240||
  reason.length<8||reason.length>500)redirect(location(client,'invalid'));
 const {data,error}=await sb.rpc('aeromind_gold_admin_save_alert_preview_rule',{
  p_subject_id:client,p_profile:profile,p_indicator:indicator,p_preview_enabled:previewEnabled,
  p_min_target_x:Number(amount),p_cooldown_minutes:Number(minutes),p_reason:reason
 });
 if(error||data?.ok!==true){
  console.error('gold_alert_preview_rule_failed',{code:error?.code||'NO_RESULT'});
  redirect(location(client,error?.code==='42501'?'permission':'error'));
 }
 revalidatePath('/admin/gold/alertas');
 redirect(location(client,'saved'));
}
