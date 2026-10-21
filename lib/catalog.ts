import { createClient } from '@supabase/supabase-js';

export type PublicPlan = {
  slug: string;
  tier: 'Básico' | 'Pro' | 'Ultra';
  duration_days: number;
  trial_quantity?:number|null;
  price_cents: number;
  visible: boolean;
  marketing_title?:string|null;
  marketing_description?:string|null;
  marketing_badge?:string|null;
  marketing_features?:string[]|null;
  marketing_cta?:string|null;
  marketing_highlight?:boolean|null;
  marketing_duration_caption?:string|null;
  marketing_unpriced_label?:string|null;
};

export async function getVisiblePlans(): Promise<PublicPlan[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.from('aeromind_plan_catalog')
    .select('slug,tier,duration_days,trial_quantity,price_cents,visible,marketing_title,marketing_description,marketing_badge,marketing_features,marketing_cta,marketing_highlight,marketing_duration_caption,marketing_unpriced_label')
    .eq('visible',true).not('price_cents','is',null);
  if(error){console.error('Erro na leitura pública do catálogo AeroMind:',error.code||'unknown');return [];}
  if(!data) return [];
  const tiers=['Básico','Pro','Ultra'];
  return data.filter(p=>tiers.includes(p.tier)
    && ([30,90,180,365].includes(p.duration_days)||
      (p.slug==='teste-horas'&&p.duration_days===1&&Number.isInteger(p.trial_quantity)&&p.trial_quantity>=1&&p.trial_quantity<=72)||
      (p.slug==='teste-dias'&&p.duration_days===2&&Number.isInteger(p.trial_quantity)&&p.trial_quantity>=1&&p.trial_quantity<=30))
    && Number.isInteger(p.price_cents)
    && p.price_cents>0
    && p.visible===true) as PublicPlan[];
}

export function formattedPrice(cents:number):string {
  return (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}

export function isTrialPlan(plan:Pick<PublicPlan,'slug'>):boolean{
 return plan.slug==='teste-horas'||plan.slug==='teste-dias';
}
export function formattedDuration(plan:Pick<PublicPlan,'slug'|'duration_days'|'trial_quantity'>):string{
 if(plan.slug==='teste-horas'){
  const hours=Number(plan.trial_quantity||1);return hours+' '+(hours===1?'hora':'horas');
 }
 if(plan.slug==='teste-dias'){
  const days=Number(plan.trial_quantity||1);return days+' '+(days===1?'dia':'dias');
 }
 return plan.duration_days+' dias';
}
