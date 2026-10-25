'use server';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {requireAdmin} from '@/lib/admin-access';

const value=(f:FormData,key:string)=>typeof f.get(key)==='string'?String(f.get(key)).trim():'';
const back=(tier:string,msg:string)=>'/admin/divulgacao?tier='+encodeURIComponent(tier)+'&msg='+encodeURIComponent(msg);
export async function saveTierCampaign(f:FormData){
 const {sb,role}=await requireAdmin();
 if(!['admin','owner'].includes(role))redirect('/admin');
 const tier=value(f,'tier');
 if(!['Pro','Gold'].includes(tier))redirect(back('Pro','invalid'));
 const features=value(f,'features').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const eyebrow=value(f,'eyebrow'),headline=value(f,'headline'),
  description=value(f,'description'),badge=value(f,'badge'),cta=value(f,'cta'),
  reason=value(f,'reason');
 const valid=eyebrow.length>=3&&eyebrow.length<=65&&
  headline.length>=5&&headline.length<=110&&
  description.length>=15&&description.length<=400&&
  badge.length>=3&&badge.length<=65&&
  cta.length>=3&&cta.length<=55&&
  reason.length>=8&&reason.length<=350&&
  features.length>=2&&features.length<=6&&
  features.every(x=>x.length>=5&&x.length<=130);
 if(!valid)redirect(back(tier,'invalid'));
 const {data,error}=await sb.rpc('aeromind_admin_save_tier_campaign',{
  p_tier:tier,p_visible:f.get('visible')==='on',
  p_eyebrow:eyebrow,p_headline:headline,p_description:description,
  p_badge:badge,p_cta_text:cta,p_features:features,p_reason:reason
 });
 if(error||data?.ok!==true){
  console.error('campaign_admin_save_failed',{code:error?.code||'NO_RESULT'});
  redirect(back(tier,error?.code==='42501'?'permission':'error'));
 }
 revalidatePath('/');
 revalidatePath('/planos');
 revalidatePath('/pro');
 revalidatePath('/gold');
 revalidatePath('/admin/divulgacao');
 redirect(back(tier,'saved'));
}
