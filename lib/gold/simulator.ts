/** AeroMind Gold — simulação somente VIRTUAL, sem envio de apostas.
 * O dia já vem convertido ao fuso escolhido; jamais inventar dias ou sinais.
 */
export const GOLD_SIMULATOR_VERSION='gold-simulator-v1';
export type ObservedSignal={id:string;day:string;released:boolean;status:'win'|'loss'|'invalidated'|'pending';target:number;origin:'live'|'shadow'|'backtest'};
export type Amount={kind:'fixed';cents:number}|{kind:'percent';percent:number};
export type SimulationOptions={initialCents:number;entry:Amount;minEntryCents:number;dailyProfit:Amount;dailyLoss:Amount;timeZone:string};
type Operation={signalId:string;day:string;stakeCents:number;pnlCents:number;balanceCents:number};
type Daily={day:string;openCents:number;closeCents:number;operations:number;reason:'profit'|'loss'|'insufficient'|'end'};
const int=(n:number)=>Number.isSafeInteger(n)&&n>=0;
function percentOfCents(cents:number,percent:number):number{
 if(!Number.isFinite(percent)||percent<=0||percent>100)throw Error('Percentual fora dos limites');
 const den=BigInt(100000000),num=BigInt(cents)*BigInt(Math.round(percent*1000000));
 const out=Number((num+den/BigInt(2))/den);
 if(!Number.isSafeInteger(out))throw Error('Valor excedeu limite seguro');
 return out;
}
function amount(x:Amount,bank:number):number{return x.kind==='fixed'?x.cents:percentOfCents(bank,x.percent)}
function validate(opt:SimulationOptions){
 if(!int(opt.initialCents)||opt.initialCents<1||!int(opt.minEntryCents)||opt.minEntryCents<1||!opt.timeZone)throw Error('Parâmetros inválidos');
 for(const cfg of [opt.entry,opt.dailyProfit,opt.dailyLoss]){
  if(!cfg||!['fixed','percent'].includes(cfg.kind))throw Error('Modo inválido');
  if(cfg.kind==='fixed'&&(!int(cfg.cents)||cfg.cents<1))throw Error('Valor em centavos inválido');
  if(cfg.kind==='percent')percentOfCents(opt.initialCents,cfg.percent);
 }
}
export function simulateGold(signals:readonly ObservedSignal[],opt:SimulationOptions){
 validate(opt);
 let balance=opt.initialCents,peak=balance,maxDrawdownCents=0,maxDrawdownPct=0;
 let wins=0,losses=0,invalidated=0,pending=0,released=0,blockedForFunds=false;
 const operations:Operation[]=[],days:Daily[]=[];
 let lastDay='',day:Daily|null=null;
 const flush=()=>{if(day){day.closeCents=balance;days.push(day)}};
 for(const signal of signals){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(signal.day)||!signal.id)throw Error('Registro sem dia/ID');
  if(lastDay&&signal.day<lastDay)throw Error('Sequência de datas inválida');
  if(signal.day!==lastDay){flush();lastDay=signal.day;day={day:lastDay,openCents:balance,closeCents:balance,operations:0,reason:'end'};}
  if(!signal.released)continue;
  released++;
  if(signal.status==='invalidated'){invalidated++;continue;}
  if(signal.status==='pending'){pending++;continue;}
  if(signal.status!=='win'&&signal.status!=='loss')throw Error('Resultado inválido');
  if(!day||day.reason!=='end'||blockedForFunds)continue;
  const stake=amount(opt.entry,balance);
  if(stake<opt.minEntryCents||stake>balance||stake<1){blockedForFunds=true;day.reason='insufficient';continue;}
  if(!int(stake)||!Number.isFinite(signal.target)||signal.target<1||signal.target>1000000)throw Error('Entrada/alvo inválido');
  const mult=BigInt(Math.round(signal.target*1000000));
  const pnl=signal.status==='loss'?-stake:Number((BigInt(stake)*(mult-BigInt(1000000))+BigInt(500000))/BigInt(1000000));
  if(!Number.isSafeInteger(pnl)||!Number.isSafeInteger(balance+pnl))throw Error('Saldo excedeu limite');
  balance+=pnl;day.operations++;
  if(signal.status==='win')wins++;else losses++;
  operations.push({signalId:signal.id,day:lastDay,stakeCents:stake,pnlCents:pnl,balanceCents:balance});
  if(balance>peak)peak=balance;
  if(peak-balance>maxDrawdownCents){maxDrawdownCents=peak-balance;maxDrawdownPct=peak?100*maxDrawdownCents/peak:0;}
  const change=balance-day.openCents;
  if(change>=amount(opt.dailyProfit,day.openCents))day.reason='profit';
  else if(-change>=amount(opt.dailyLoss,day.openCents))day.reason='loss';
 }
 flush();
 return {version:GOLD_SIMULATOR_VERSION,initialCents:opt.initialCents,finalCents:balance,
  netCents:balance-opt.initialCents,released,wins,losses,invalidated,pending,operationsCount:operations.length,
  hitRate:wins+losses?wins/(wins+losses):null,maxDrawdownCents,maxDrawdownPct,days,
  profitDays:days.filter(d=>d.reason==='profit').length,lossDays:days.filter(d=>d.reason==='loss').length,
  noOperationDays:days.filter(d=>d.operations===0).length,operations,
  assumptions:'Banca virtual, sem taxas/derrapagem, liquidação idealizada no alvo; não representa ganhos reais.'};
}
