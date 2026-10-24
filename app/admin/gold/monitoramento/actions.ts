'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const key=/^[A-Za-z0-9_.:-]{1,80}$/;
const stream=/^[A-Za-z0-9_-]{3,48}$/;
const field=(f:FormData,k:string)=>typeof f.get(k)==='string'?String(f.get(k)).trim():'';
const url=(id:string,msg:string)=>'/admin/gold/monitoramento?cliente='+encodeURIComponent(id)+'&msg='+encodeURIComponent(msg);
const finite=(s:string)=>/^(?:[0-9]+)(?:[.,][0-9]{1,4})?$/.test(s)?Number(s.replace(',','.')):NaN;

export async function recordGoldRound(f:FormData){
 const {sb,role}=await requireAdmin();
 if(role!=='admin'&&role!=='owner')redirect('/admin');
 const id=field(f,'cliente'),p_stream=field(f,'stream'),p_round_key=field(f,'round'),amount=finite(field(f,'multiplier'));
 if(!uuid.test(id)||!stream.test(p_stream)||!key.test(p_round_key)||!Number.isFinite(amount)||amount<1||amount>1000000)
  redirect(url(id,'invalid'));
 const {data,error}=await sb.rpc('aeromind_gold_admin_record_round',{
  p_subject_id:id,p_stream,p_round_key,p_multiplier:amount
 });
 if(error||data?.ok!==true){
  console.error('gold_round_record_failed',{code:error?.code||'NO_RESULT'});
  redirect(url(id,error?.code==='23505'?'duplicate':'error'));
 }
 revalidatePath('/admin/gold/monitoramento');
 redirect(url(id,'round-saved'));
}

export async function recordGoldSignal(f:FormData){
 const {sb,role}=await requireAdmin();
 if(role!=='admin'&&role!=='owner')redirect('/admin');
 const id=field(f,'cliente'),p_stream=field(f,'stream'),p_next_round_key=field(f,'next_round');
 const p_anchor_round_key=field(f,'anchor_round');
 const p_profile=field(f,'profile'),p_indicator=field(f,'indicator');
 const amount=finite(field(f,'target'));
 if(!uuid.test(id)||!stream.test(p_stream)||!key.test(p_next_round_key)||!key.test(p_anchor_round_key)||
  !['Clássico','Refinado','Gold'].includes(p_profile)||!['BAIXA','MEDIANA','ALTA'].includes(p_indicator)||
  !Number.isFinite(amount)||amount<1||amount>1000000)redirect(url(id,'invalid'));
 const {data,error}=await sb.rpc('aeromind_gold_admin_record_signal',{
  p_subject_id:id,p_stream,p_next_round_key,p_anchor_round_key,p_profile,p_indicator,
  p_target_x:amount,p_rule_version:p_profile==='Clássico'?'legacy-unverified-v1':'manual-declared-v1'
 });
 if(error||data?.ok!==true){
  console.error('gold_signal_record_failed',{code:error?.code||'NO_RESULT'});
  redirect(url(id,error?.code==='23505'?'duplicate':error?.code==='22023'?'sequence':'error'));
 }
 revalidatePath('/admin/gold/monitoramento');
 redirect(url(id,'signal-saved'));
}
