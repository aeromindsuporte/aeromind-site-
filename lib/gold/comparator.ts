/**
 * AeroMind Gold — comparação sequencial OFFLINE, sem apostas ou sinais reais.
 * Cada decisão da rodada N usa SOMENTE resultados confirmados anteriores a N.
 * Uma importação retrospectiva NÃO comprova que o sinal existiu ao vivo.
 */
import {
 CLASSIC_TARGETS,REFINED_DEFAULT,GOLD_ENGINE_VERSION,
 evaluateGoldOrRefined,target,validateGoldSettings,
 type Indicator,type Settings
} from './indicators';

export const GOLD_COMPARISON_VERSION='gold-offline-walkforward-v1';
export type ImportedRound={id:string;at:string;multiplier:number};
export type ComparedProfile='Clássico'|'Refinado'|'Gold';
export type ComparisonState='regra_legada_nao_auditada'|'liberado'|'aguardando_condicao'|'historico_incompleto'|'descartado_gap';
export type ComparedDecision={
 lastClosedId:string;nextId:string;nextAt:string;profile:ComparedProfile;
 indicator:Indicator;target:number|null;state:ComparisonState;
 observed:number;thresholdReached:boolean|null;ruleVersion:string;
};
export type ComparisonSummary={
 profile:ComparedProfile;indicator:Indicator;assessed:number;released:number;
 thresholdReached:number;thresholdMissed:number;incomplete:number;skipped:number;
 hitRate:number|null;
};
export type ComparisonResult={
 version:string;source:'offline-import';rounds:number;range:{first:string;last:string};
 decisions:ComparedDecision[];summary:ComparisonSummary[];
 disclaimer:string;
};
const numberPattern=/^(?:[0-9]+(?:[.,][0-9]+)?)$/;
const isoWithOffset=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/;
const indicators:readonly Indicator[]=['BAIXA','MEDIANA','ALTA'];
const profiles:readonly ComparedProfile[]=['Clássico','Refinado','Gold'];
const delta=(later:ImportedRound,earlier:ImportedRound)=>(
 Date.parse(later.at)-Date.parse(earlier.at)
)/1000;

export function parseGoldRoundsCsv(input:string):ImportedRound[]{
 if(typeof input!=='string'||input.length>130000)throw Error('Arquivo maior que o limite de 130 KB.');
 const lines=input.replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 if(lines.length<3||lines.length>1501)throw Error('Informe entre 2 e 1.500 rodadas, com cabeçalho.');
 const expected='id;data_hora_iso;resultado_x';
 if(lines[0].trim().toLowerCase()!==expected){
  throw Error('Cabeçalho esperado: '+expected);
 }
 const seen=new Set<string>();
 let previousTime=0;
 return lines.slice(1).map((line,i)=>{
  const fields=line.split(';').map(s=>s.trim());
  const number=fields[2];
  const id=fields[0]||'',at=fields[1]||'';
  if(fields.length!==3||!/^[A-Za-z0-9_.:-]{1,64}$/.test(id)||!isoWithOffset.test(at)||
   !numberPattern.test(number||''))throw Error('Linha '+(i+2)+': use ID, data ISO com fuso e multiplicador.');
  const time=Date.parse(at),multiplier=Number(number.replace(',','.'));
  if(!Number.isFinite(time)||!Number.isFinite(multiplier)||multiplier<1||multiplier>1000000)throw Error('Linha '+(i+2)+': data ou resultado inválido.');
  if(seen.has(id))throw Error('ID repetido na linha '+(i+2)+'.');
  if(i>0&&time<=previousTime)throw Error('Horários precisam ser crescentes (linha '+(i+2)+').');
  previousTime=time;seen.add(id);
  return {id,at,multiplier};
 });
}

export function compareGoldOffline(
 rows:readonly ImportedRound[],
 settings:Settings=REFINED_DEFAULT as Settings,
 sessionConfirmed=false
):ComparisonResult{
 if(!Array.isArray(rows)||rows.length<2||rows.length>1500)throw Error('Quantidade de rodadas inválida.');
 if(!validateGoldSettings(settings))throw Error('Parâmetros Gold inválidos.');
 const seen=new Set<string>();
 let previousTime=-Infinity;
 for(const [i,row] of rows.entries()){
  if(!row||!/^[A-Za-z0-9_.:-]{1,64}$/.test(row.id)||!isoWithOffset.test(row.at)||
   !Number.isFinite(row.multiplier)||row.multiplier<1||row.multiplier>1000000)
   throw Error('Rodada inválida na posição '+(i+1)+'.');
  const timestamp=Date.parse(row.at);
  if(!Number.isFinite(timestamp)||timestamp<=previousTime||seen.has(row.id))
   throw Error('ID duplicado ou horário fora de ordem.');
  previousTime=timestamp;seen.add(row.id);
 }
 const decisions:ComparedDecision[]=[];
 let confirmedStreak=1;
 for(let i=1;i<rows.length;i++){
  const previous=rows[i-1],current=rows[i],history=rows.slice(0,i).map(x=>x.multiplier);
  const priorGap=i>=2?delta(rows[i-1],rows[i-2]):0;
  if(i>=2)confirmedStreak=priorGap>300?1:confirmedStreak+1;
  const outcomeGap=delta(current,previous)>300;
  const integrity={
   consecutiveConfirmed:confirmedStreak,
   continuityValid:priorGap<=300,
   gapSeconds:priorGap,
   sessionValidated:sessionConfirmed
  };
  for(const profile of profiles)for(const indicator of indicators){
   let estimated:number|null=null;
   let state:ComparisonState='regra_legada_nao_auditada';
   if(profile==='Clássico')estimated=target(history,CLASSIC_TARGETS[indicator]);
   else{
    const evaluation=evaluateGoldOrRefined(history,indicator,profile,integrity,settings);
    estimated=evaluation.target;
    state=evaluation.state;
    // Esta lacuna só é conhecida na liquidação. Invalidar, nunca inventar acerto.
    if(outcomeGap&&state==='liberado')state='descartado_gap';
   }
   decisions.push({
    lastClosedId:previous.id,nextId:current.id,nextAt:current.at,profile,indicator,
    target:estimated,state,observed:current.multiplier,
    thresholdReached:state==='liberado'&&estimated!==null?current.multiplier>=estimated:null,
    ruleVersion:profile==='Clássico'?'alvo-legado-referencia-apenas':GOLD_ENGINE_VERSION
   });
  }
 }
 const summary=profiles.flatMap(profile=>indicators.map(indicator=>{
  const group=decisions.filter(d=>d.profile===profile&&d.indicator===indicator);
  const released=group.filter(d=>d.state==='liberado');
  const thresholdReached=released.filter(d=>d.thresholdReached===true).length;
  const thresholdMissed=released.length-thresholdReached;
  return {profile,indicator,assessed:group.length,released:released.length,
   thresholdReached,thresholdMissed,
   incomplete:group.filter(d=>d.state==='historico_incompleto').length,
   skipped:group.length-released.length-group.filter(d=>d.state==='historico_incompleto').length,
   hitRate:released.length?thresholdReached/released.length:null};
 }));
 return {
  version:GOLD_COMPARISON_VERSION,source:'offline-import',rounds:rows.length,
  range:{first:rows[0].at,last:rows[rows.length-1].at},
  decisions,summary,
  disclaimer:'Comparação offline de limiares, sem apostas, payout ou lucro. Dados importados posteriormente não demonstram sinais emitidos em tempo real. O filtro Clássico do Android ainda não foi auditado.'
 };
}
function csvCell(value:unknown){
 const str=value===null||value===undefined?'':String(value);
 const safe=/^[=+@\-\t\r]/.test(str)?"'"+str:str;
 return '"'+safe.replace(/"/g,'""')+'"';
}
export function goldComparisonCsv(result:ComparisonResult):string{
 const header=['last_closed_id','next_round_id','next_at','profile','indicator','target_x','state','observed_x','threshold_reached','rule_version'];
 const lines=result.decisions.map(x=>[
  x.lastClosedId,x.nextId,x.nextAt,x.profile,x.indicator,x.target,x.state,x.observed,
  x.thresholdReached===null?'':x.thresholdReached?'sim':'nao',x.ruleVersion
 ].map(csvCell).join(';'));
 return '\uFEFF'+header.join(';')+'\r\n'+lines.join('\r\n')+'\r\n';
}
