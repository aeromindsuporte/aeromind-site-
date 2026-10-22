// Validação única do formulário administrativo de planos.
// R$ 0,00 só é permitido para os dois modelos de teste sem Pix.
export type PlanInputError='invalid'|'plan-price'|'plan-duration'|'plan-benefits'|'plan-text';
export type PlanEditorInput={
 p_slug:string;p_price_cents:number|null;p_visible:boolean;p_trial_quantity:number|null;
 p_title:string;p_description:string;p_badge:string;p_features:string[];
 p_cta:string;p_highlight:boolean;p_duration_caption:string;p_unpriced_label:string;
};
export type PlanParseResult={ok:true;value:PlanEditorInput}|{ok:false;code:PlanInputError};
const value=(fd:FormData,key:string)=>typeof fd.get(key)==='string'?(fd.get(key) as string).trim():'';
export function parsePlanEditorForm(fd:FormData):PlanParseResult{
 const slug=value(fd,'slug');
 if(!/^((basico|pro|ultra)-(mensal|trimestral|semestral|anual)|teste-(horas|dias))$/.test(slug))
  return {ok:false,code:'invalid'};
 const isTrial=slug==='teste-horas'||slug==='teste-dias';
 const rawPrice=value(fd,'price').replace(',','.');
 const freeTrial=isTrial&&value(fd,'free_trial')==='on';
 let cents:number|null=null;
 if(freeTrial)cents=0;
 else if(rawPrice!==''){
  const amount=Number(rawPrice);
  if(!Number.isFinite(amount)||amount<0||amount>1000000||
   Math.abs(amount*100-Math.round(amount*100))>0.001)return {ok:false,code:'plan-price'};
  cents=Math.round(amount*100);
 }
 const visible=value(fd,'visible')==='on';
 if(visible&&(cents===null||(cents!==0&&cents<200)))return {ok:false,code:'plan-price'};
 if(cents===0&&!isTrial)return {ok:false,code:'plan-price'};
 // Mesmo quando o navegador omite o checkbox, um plano de teste configurado
 // explicitamente a zero continua gratuito e não vira uma cobrança Pix.
 let quantity:number|null=null;
 if(isTrial){
  const rawQuantity=value(fd,'quantity');
  if(!/^\d+$/.test(rawQuantity))return {ok:false,code:'plan-duration'};
  quantity=Number(rawQuantity);
  if(!Number.isSafeInteger(quantity)||quantity<1||
    quantity>(slug==='teste-horas'?72:30))return {ok:false,code:'plan-duration'};
 }
 const title=value(fd,'title'),description=value(fd,'description'),
  badge=value(fd,'badge'),cta=value(fd,'cta'),
  durationCaption=value(fd,'duration_caption'),
  unpricedLabel=value(fd,'unpriced_label');
 const features=value(fd,'features').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(title.length>65||description.length>240||badge.length>38||cta.length>40||
   durationCaption.length>80||unpricedLabel.length>40)return {ok:false,code:'plan-text'};
 if(features.length>8||features.some(x=>x.length>115))return {ok:false,code:'plan-benefits'};
 return {ok:true,value:{
  p_slug:slug,p_price_cents:cents,p_visible:visible,p_trial_quantity:quantity,
  p_title:title,p_description:description,p_badge:badge,p_features:features,
  p_cta:cta,p_highlight:value(fd,'highlight')==='on',
  p_duration_caption:durationCaption,p_unpriced_label:unpricedLabel,
 }};
}
