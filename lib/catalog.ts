import { createClient } from '@supabase/supabase-js';

export type PublicPlan = {
  slug: string;
  tier: 'Básico' | 'Pro' | 'Ultra';
  duration_days: number;
  price_cents: number;
  visible: boolean;
  marketing_title: string | null;
  marketing_description: string | null;
  marketing_badge: string | null;
  marketing_features: string[] | null;
  marketing_cta: string | null;
  marketing_highlight: boolean;
};

export async function getVisiblePlans(): Promise<PublicPlan[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.from('aeromind_plan_catalog')
    .select('slug,tier,duration_days,price_cents,visible,marketing_title,marketing_description,marketing_badge,marketing_features,marketing_cta,marketing_highlight')
    .eq('visible',true).not('price_cents','is',null);
  if(error || !data) return [];
  const tiers=['Básico','Pro','Ultra'];
  return data.filter(p=>tiers.includes(p.tier)
    && [30,90,180,365].includes(p.duration_days)
    && Number.isInteger(p.price_cents)
    && p.price_cents>0
    && p.visible===true) as PublicPlan[];
}

export function formattedPrice(cents:number):string {
  return (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}
