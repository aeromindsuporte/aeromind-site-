import {createClient} from '@supabase/supabase-js';

/** Copy-only marketing catalogue; never changes license, pricing, entitlements or checkout. */
export type Campaign={
 tier:'Pro'|'Gold';visible:boolean;eyebrow:string;headline:string;
 description:string;badge:string;cta_text:string;features:string[];
 updated_at?:string
};
export async function getPublicCampaigns():Promise<Campaign[]>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return [];
 const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await sb.from('aeromind_tier_campaigns')
  .select('tier,visible,eyebrow,headline,description,badge,cta_text,features')
  .eq('visible',true);
 if(error){console.error('campaign_public_read_failed',{code:error.code});return []}
 return (data||[]).filter((c):c is Campaign=>['Gold','Pro'].includes(c.tier)
  && Array.isArray(c.features)&&c.features.every((x:unknown)=>typeof x==='string'));
}
export async function getPublicCampaign(tier:'Pro'|'Gold'):Promise<Campaign|null>{
 const campaigns=await getPublicCampaigns();
 return campaigns.find(x=>x.tier===tier)||null;
}
