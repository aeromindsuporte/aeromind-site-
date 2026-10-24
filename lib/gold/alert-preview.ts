/**
 * AeroMind Gold 6 — PRÉVIA de avisos internos a partir de registros ADMINISTRATIVOS manuais.
 * Os resultados não são uma captura autorizada da plataforma. Nada é enviado a usuários.
 */
import {goldProspectiveReport,type GoldRound,type GoldSignal} from './prospective.ts';
export type GoldPreviewRule={
 id:number;subject_id:string;profile:'Refinado'|'Gold';
 indicator:'BAIXA'|'MEDIANA'|'ALTA';preview_enabled:boolean;
 min_target_x:number;cooldown_minutes:number;delivery_enabled:false;updated_at:string
};
export type PreviewDecisionState=
 'lab_candidate'|'no_rule'|'preview_disabled'|'below_minimum'|
 'resolved'|'expired'|'cooldown'|'invalid_clock';
export type PreviewDecision={signalId:number;subjectId:string;profile:string;indicator:string;
 stream:string;nextRound:string;target:number;emittedAt:string;state:PreviewDecisionState};
export type PreviewReport={source:'manual_declared';deliveryEnabled:false;
 candidateCount:number;expiredCount:number;cooldownCount:number;decisions:PreviewDecision[];
 note:string};
const key=(s:GoldSignal)=>[s.subject_id,s.profile,s.indicator].join('|');
const cooldownKey=(s:GoldSignal)=>[s.subject_id,s.stream_key,s.profile,s.indicator].join('|');
export function evaluateGoldAlertPreview(
 rules:readonly GoldPreviewRule[],signals:readonly GoldSignal[],
 rounds:readonly GoldRound[],nowISO:string,maxAgeSeconds=180
):PreviewReport{
 const now=Date.parse(nowISO);
 if(!Number.isFinite(now)||!Number.isInteger(maxAgeSeconds)||maxAgeSeconds<1||maxAgeSeconds>600)
  throw Error('Relógio ou janela de expiração inválida');
 const rmap=new Map<string,GoldPreviewRule>();
 for(const rule of rules){
  if(!rule||!['Gold','Refinado'].includes(rule.profile)||!['BAIXA','MEDIANA','ALTA'].includes(rule.indicator)
   ||rule.delivery_enabled!==false||!Number.isFinite(Number(rule.min_target_x))
   ||Number(rule.min_target_x)<1||Number(rule.min_target_x)>1000000
   ||!Number.isInteger(rule.cooldown_minutes)||rule.cooldown_minutes<1||rule.cooldown_minutes>240)
   throw Error('Regra de prévia fora do catálogo');
  rmap.set([rule.subject_id,rule.profile,rule.indicator].join('|'),rule);
 }
 const resolution=new Map(goldProspectiveReport(signals,rounds).signals.map(x=>[x.id,x.state]));
 const acceptedAt=new Map<string,number>();
 const ordered=[...signals].sort((a,b)=>Date.parse(a.emitted_at)-Date.parse(b.emitted_at)||a.id-b.id);
 const decisions=ordered.map(s=>{
  const rule=rmap.get(key(s));
  const emittedAt=Date.parse(s.emitted_at);
  let state:PreviewDecisionState='no_rule';
  if(!Number.isFinite(emittedAt)||emittedAt>now+1000)state='invalid_clock';
  else if(!rule)state='no_rule';
  else if(!rule.preview_enabled)state='preview_disabled';
  else if(Number(s.target_x)<Number(rule.min_target_x))state='below_minimum';
  else if(resolution.get(s.id)!=='aguardando_resultado')state='resolved';
  else if(now-emittedAt>maxAgeSeconds*1000)state='expired';
  else{
   const ck=cooldownKey(s),last=acceptedAt.get(ck);
   if(last!==undefined&&emittedAt-last<rule.cooldown_minutes*60000)state='cooldown';
   else{state='lab_candidate';acceptedAt.set(ck,emittedAt)}
  }
  return {signalId:s.id,subjectId:s.subject_id,profile:s.profile,indicator:s.indicator,
   stream:s.stream_key,nextRound:s.next_round_key,target:Number(s.target_x),
   emittedAt:s.emitted_at,state};
 });
 return {source:'manual_declared',deliveryEnabled:false,
  candidateCount:decisions.filter(x=>x.state==='lab_candidate').length,
  expiredCount:decisions.filter(x=>x.state==='expired').length,
  cooldownCount:decisions.filter(x=>x.state==='cooldown').length,
  decisions:decisions.reverse(),
  note:'Prévia administrativa calculada no momento da consulta. Não há notificações, feed externo, coleta certificada ou envio automático.'};
}
