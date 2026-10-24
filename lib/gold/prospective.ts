/** Gold Fase 5: relatório manual prospectivo. Sem inferir aposta, ROI ou fonte ao vivo. */
export type GoldRound={
 id:number;subject_id:string;stream_key:string;round_key:string;multiplier:number;
 source_kind:'manual_admin';observed_at:string
};
export type GoldSignal={
 id:number;subject_id:string;stream_key:string;next_round_key:string;
 anchor_round_id:number;profile:'Clássico'|'Refinado'|'Gold';
 indicator:'BAIXA'|'MEDIANA'|'ALTA';target_x:number;
 rule_version:string;evidence_type:'manual_declared';emitted_at:string
};
export type SignalState='aguardando_resultado'|'limiar_atingido'|'limiar_nao_atingido'|'ordem_inconsistente';
export type SignalRow=GoldSignal&{state:SignalState;observed_x:number|null;observed_at:string|null};
export type Summary={profile:GoldSignal['profile'];indicator:GoldSignal['indicator'];total:number;resolved:number;hit:number;miss:number;pending:number;inconsistent:number;hitRate:number|null};
export type GoldProspectiveReport={
 signals:SignalRow[];summaries:Summary[];roundCount:number;signalCount:number;
 gapsOver300:number;latestObserved:string|null;source:'manual_admin';sourceVerified:false
};
const profiles:readonly GoldSignal['profile'][]=['Clássico','Refinado','Gold'];
const indicators:readonly GoldSignal['indicator'][]=['BAIXA','MEDIANA','ALTA'];
const roundKey=(stream:string,id:string)=>stream+'\u0000'+id;

export function goldProspectiveReport(signals:readonly GoldSignal[],rounds:readonly GoldRound[]):GoldProspectiveReport{
 const results=new Map<string,GoldRound>();
 for(const r of rounds){
  if(r.source_kind!=='manual_admin')throw Error('Fonte de rodada desconhecida');
  results.set(roundKey(r.stream_key,r.round_key),r);
 }
 const items=signals.map(s=>{
  if(s.evidence_type!=='manual_declared')throw Error('Origem do sinal desconhecida');
  const r=results.get(roundKey(s.stream_key,s.next_round_key));
  const orderValid=!!r&&Date.parse(r.observed_at)>Date.parse(s.emitted_at);
  const state:SignalState=!r?'aguardando_resultado':!orderValid?'ordem_inconsistente':Number(r.multiplier)>=Number(s.target_x)?'limiar_atingido':'limiar_nao_atingido';
  return {...s,state,observed_x:r?Number(r.multiplier):null,observed_at:r?.observed_at||null};
 });
 const summaries=profiles.flatMap(profile=>indicators.map(indicator=>{
  const list=items.filter(x=>x.profile===profile&&x.indicator===indicator);
  const hit=list.filter(x=>x.state==='limiar_atingido').length;
  const miss=list.filter(x=>x.state==='limiar_nao_atingido').length;
  const pending=list.filter(x=>x.state==='aguardando_resultado').length;
  const inconsistent=list.filter(x=>x.state==='ordem_inconsistente').length;
  return {profile,indicator,total:list.length,resolved:hit+miss,hit,miss,pending,inconsistent,hitRate:hit+miss?hit/(hit+miss):null};
 }));
 const sorted=[...rounds].sort((a,b)=>Date.parse(a.observed_at)-Date.parse(b.observed_at));
 let gapsOver300=0;
 for(let i=1;i<sorted.length;i++){
  const a=sorted[i-1],b=sorted[i];
  if(a.stream_key===b.stream_key&&Date.parse(b.observed_at)-Date.parse(a.observed_at)>300000)gapsOver300++;
 }
 return {signals:items,summaries,roundCount:rounds.length,signalCount:signals.length,
  gapsOver300,latestObserved:sorted.length?sorted[sorted.length-1].observed_at:null,source:'manual_admin',sourceVerified:false};
}
/** Prevent spreadsheet CSV formulas (even if an ID validation changes later). */
const cell=(v:unknown)=>{
 let s=v===undefined||v===null?'':String(v);
 if(/^[=+@\-\t\r]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
};
export function goldProspectiveCsv(data:GoldProspectiveReport):string{
 const rows=data.signals.map(s=>[
  s.stream_key,s.next_round_key,s.profile,s.indicator,s.target_x,s.emitted_at,
  s.state,s.observed_x,s.observed_at,s.rule_version,'manual_admin'
 ].map(cell).join(';'));
 return '\uFEFF'+'stream;round_id;profile;indicator;target_x;recorded_at;state;observed_x;observed_at;rule_version;source\r\n'+rows.join('\r\n')+'\r\n';
}
