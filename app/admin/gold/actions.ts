'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';
import {validateGoldSettings,type Indicator,type FilterSpec,type TargetRule,type Settings} from '@/lib/gold/indicators';

const field=(f:FormData,k:string):string=>{
 const v=f.get(k);
 return typeof v==='string'?v.trim():'';
};
const validEmail=(s:string)=>s.length<=320&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const reason=(s:string)=>s.length>=8&&s.length<=500;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const back=(f:FormData,msg:string)=>{
 const client=field(f,'return_client');
 return '/admin/gold?msg='+encodeURIComponent(msg)+(uuid.test(client)?'&cliente='+encodeURIComponent(client):'');
};

export async function saveGoldAccess(f:FormData){
 const {sb}=await requireAdmin();
 const email=field(f,'email').toLowerCase();
 const isEnabled=field(f,'operation')==='grant';
 const operation=field(f,'operation');
 const note=field(f,'reason');
 const date=field(f,'valid_until');
 if(!validEmail(email)||!['grant','revoke'].includes(operation)||!reason(note))redirect(back(f,'invalid'));
 let expires:string|null=null;
 if(isEnabled){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))redirect(back(f,'invalid'));
  const dt=new Date(date+'T23:59:59-03:00');
  if(!Number.isFinite(dt.getTime())||dt.getTime()<=Date.now())redirect(back(f,'expiry'));
  expires=dt.toISOString();
 }
 const {data,error}=await sb.rpc('aeromind_gold_admin_set_access',{
  p_email:email,p_enabled:isEnabled,p_valid_until:expires,p_reason:note
 });
 if(error||data?.ok!==true){
  const msg=error?.code==='22023'?'invalid':error?.code==='42501'?'permission':'error';
  console.error('gold_access_admin_failed',{code:error?.code||'NO_RESULT'});
  redirect(back(f,msg));
 }
 revalidatePath('/admin/gold');
 revalidatePath('/minha-conta');
 redirect(back(f,isEnabled?'granted':'revoked'));
}
function parseFilter(f:FormData,prefix:string):FilterSpec{
 const mode=field(f,prefix+'_mode');
 const k=Number(field(f,prefix+'_k'));
 const a=Number(field(f,prefix+'_a'));
 const b=Number(field(f,prefix+'_b'));
 if(mode==='continuous')return {mode};
 if(mode==='purple_count')return {mode,k:k as 5|6|7};
 if(mode==='purple_improving')return {mode,k:k as 4|5|6};
 if(mode==='paying_counts')return {mode,a:a as 8|9|10,b:b as 2|3|4};
 return {mode:'continuous',unexpected:mode} as unknown as FilterSpec;
}
function settingsFromForm(f:FormData):Settings{
 const out={} as Settings;
 for(const k of ['BAIXA','MEDIANA','ALTA'] as Indicator[]){
  const prefix=k.toLowerCase();
  out[k]={target:field(f,prefix+'_target') as TargetRule,filter:parseFilter(f,prefix)};
 }
 return out;
}
export async function saveGoldConfiguration(f:FormData){
 const {sb}=await requireAdmin();
 const email=field(f,'email').toLowerCase();
 const note=field(f,'reason');
 const config=settingsFromForm(f);
 if(!validEmail(email)||!reason(note)||!validateGoldSettings(config))redirect(back(f,'invalid-config'));
 const {data,error}=await sb.rpc('aeromind_gold_admin_save_config',{
  p_email:email,p_settings:config,p_reason:note
 });
 if(error||data?.ok!==true){
  console.error('gold_config_admin_failed',{code:error?.code||'NO_RESULT'});
  redirect(back(f,error?.code==='22023'?'invalid-config':error?.code==='42501'?'permission':'error'));
 }
 revalidatePath('/admin/gold');
 redirect(back(f,'config-saved'));
}
