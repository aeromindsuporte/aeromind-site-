/**
 * AeroMind Gold v1 — núcleo puro, SEM integração com o Android ou banco atual.
 * Entradas: resultados confirmados, do mais antigo para o mais recente.
 * Nenhum cálculo aqui emite aposta, altera placares ou cria sinais retroativos.
 */
export const GOLD_ENGINE_VERSION='gold-indicators-v1';
export type Indicator='BAIXA'|'MEDIANA'|'ALTA';
export type Profile='Clássico'|'Refinado'|'Gold';
export type TargetRule='low35'|'column7_5_p25'|'column7_5_p50'|'column7_5_p75'|'column7_6_p75'|'column7_7_p75';
export type FilterSpec=
 | {mode:'continuous'}
 | {mode:'purple_count';k:5|6|7}
 | {mode:'purple_improving';k:4|5|6}
 | {mode:'paying_counts';a:8|9|10;b:2|3|4};
export type Rule={target:TargetRule;filter:FilterSpec};
export type Settings=Record<Indicator,Rule>;
export type Integrity={consecutiveConfirmed:number;continuityValid:boolean;gapSeconds:number;sessionValidated:boolean};
export type Evaluation={indicator:Indicator;profile:Profile;engineVersion:string;target:number|null;state:'liberado'|'aguardando_condicao'|'historico_incompleto';filterPassed:boolean|null;reason:string};

export const REFINED_DEFAULT:Readonly<Settings>=Object.freeze({
 BAIXA:{target:'low35',filter:{mode:'purple_count',k:6}},
 MEDIANA:{target:'column7_5_p50',filter:{mode:'purple_count',k:6}},
 ALTA:{target:'column7_7_p75',filter:{mode:'paying_counts',a:9,b:3}}
});
export const CLASSIC_TARGETS:Readonly<Record<Indicator,TargetRule>>=Object.freeze({
 BAIXA:'column7_5_p25',MEDIANA:'column7_5_p50',ALTA:'column7_5_p75'
});
const OPTIONS:Record<Indicator,readonly TargetRule[]>={
 BAIXA:['low35','column7_5_p25'],
 MEDIANA:['column7_5_p50'],
 ALTA:['column7_5_p75','column7_6_p75','column7_7_p75']
};
function allowedNumber(n:unknown,options:readonly number[]):boolean{return typeof n==='number'&&Number.isInteger(n)&&options.includes(n);}
function validFilter(filter:FilterSpec):boolean{
 if(!filter||typeof filter!=='object')return false;
 switch(filter.mode){
  case 'continuous':return Object.keys(filter).length===1;
  case 'purple_count':return Object.keys(filter).length===2&&allowedNumber(filter.k,[5,6,7]);
  case 'purple_improving':return Object.keys(filter).length===2&&allowedNumber(filter.k,[4,5,6]);
  case 'paying_counts':return Object.keys(filter).length===3&&allowedNumber(filter.a,[8,9,10])&&allowedNumber(filter.b,[2,3,4]);
  default:return false;
 }
}
export function validateGoldSettings(candidate:unknown):candidate is Settings{
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return false;
 const obj=candidate as Record<string,unknown>;
 if(Object.keys(obj).sort().join(',')!=='ALTA,BAIXA,MEDIANA')return false;
 return (['BAIXA','MEDIANA','ALTA'] as const).every(key=>{
  const x=obj[key] as Rule|undefined;
  return !!x&&typeof x==='object'&&!Array.isArray(x)
   &&Object.keys(x).sort().join(',')==='filter,target'
   &&OPTIONS[key].includes(x.target)
   &&validFilter(x.filter);
 });
}
function validNumbers(values:readonly number[]):boolean{return values.every(v=>Number.isFinite(v)&&v>=0&&v<=1000000);}
/** Round half up using an integer scale, never currency floating-point accumulation. */
export function percentileHalfUp(values:readonly number[],p:25|50|75):number{
 if(!values.length||!validNumbers(values))throw Error('Amostra inválida');
 const sorted=values.map(n=>BigInt(Math.round(n*1000000))).sort((a,b)=>a<b?-1:a>b?1:0);
 const numerator=(sorted.length-1)*p,index=Math.floor(numerator/100),fraction=numerator%100;
 const exact=sorted[index]*BigInt(100-fraction)+sorted[Math.min(index+1,sorted.length-1)]*BigInt(fraction);
 // exact is scaled by 100*1e6. Convert to centimultipliers with HALF_UP.
 return Number((exact+BigInt(500000))/BigInt(1000000))/100;
}
/** Amostra da coluna 7: i-7, i-14,... nunca "últimas 7 rodadas". */
export function column7(values:readonly number[],n:5|6|7):number[]|null{
 if(values.length<7*n||!validNumbers(values))return null;
 return Array.from({length:n},(_,j)=>values[values.length-7*(j+1)]);
}
export function target(values:readonly number[],rule:TargetRule):number|null{
 if(!validNumbers(values))return null;
 if(rule==='low35')return values.length>=35?percentileHalfUp(values.slice(-35),25):null;
 const parsed=/^column7_(5|6|7)_p(25|50|75)$/.exec(rule);
 if(!parsed)return null;
 const sample=column7(values,Number(parsed[1]) as 5|6|7);
 return sample?percentileHalfUp(sample,Number(parsed[2]) as 25|50|75):null;
}
const purple=(n:number)=>n>=2&&n<10;
const paying=(n:number)=>n>=2;
export function filterPassed(values:readonly number[],f:FilterSpec):boolean|null{
 if(!validNumbers(values)||!validFilter(f))return null;
 if(f.mode==='continuous')return true;
 if(f.mode==='purple_count')return values.length<10?null:values.slice(-10).filter(purple).length>=f.k;
 if(f.mode==='purple_improving'){
  if(values.length<20)return null;
  const now=values.slice(-10).filter(purple).length,older=values.slice(-20,-10).filter(purple).length;
  return now>=f.k&&now>older;
 }
 if(values.length<13)return null;
 return values.slice(-13).filter(paying).length>=f.a&&values.slice(-5).filter(paying).length>=f.b;
}
export function goldRule(indicator:Indicator,settings:Settings=REFINED_DEFAULT as Settings):Rule{
 if(!validateGoldSettings(settings))throw Error('Configuração Gold fora do catálogo');
 return settings[indicator];
}
/**
 * Apenas cálculo prospectivo: chamar antes de iniciar a próxima rodada, com histórico
 * confirmado. Proteções comuns sobrepõem-se a TODOS os perfis.
 * Para Clássico o filtro B4 atual deve ser fornecido pela implementação Android
 * após auditoria do código; este núcleo não presume ou altera o filtro legado.
 */
export function evaluateGoldOrRefined(
 results:readonly number[],indicator:Indicator,profile:'Refinado'|'Gold',
 integrity:Integrity,settings:Settings=REFINED_DEFAULT as Settings
):Evaluation{
 const rule=profile==='Refinado'?REFINED_DEFAULT[indicator]:goldRule(indicator,settings);
 const v=target(results,rule.target);
 const status=filterPassed(results,rule.filter);
 const incomplete=!integrity.continuityValid||!integrity.sessionValidated||
  !Number.isFinite(integrity.gapSeconds)||integrity.gapSeconds>300||
  integrity.consecutiveConfirmed<50||v===null||status===null;
 const state=incomplete?'historico_incompleto':status?'liberado':'aguardando_condicao';
 return {indicator,profile,engineVersion:GOLD_ENGINE_VERSION,target:v,state,
  filterPassed:status,reason:incomplete?'Histórico ou sessão sem continuidade confirmada':status?'Filtro atendido':'Aguardando condição do perfil'};
}
/** Gold nunca é inferido do nome Premium, Pro ou Ultra. */
export function canUseGold(input:{appAccess:boolean;goldAccess:boolean;accountSuspended:boolean;goldEnabled:boolean}):boolean{
 return input.appAccess===true&&input.goldAccess===true&&input.accountSuspended===false&&input.goldEnabled===true;
}
