import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseGoldRoundsCsv,compareGoldOffline,goldComparisonCsv} from '../lib/gold/comparator.ts';
import {REFINED_DEFAULT} from '../lib/gold/indicators.ts';

const rows=(n,multiplier=2.5)=>Array.from({length:n},(_,i)=>({
 id:'r'+i,at:new Date(Date.parse('2026-10-24T10:00:00-03:00')+i*30_000).toISOString(),
 multiplier
}));
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('importação exige cabeçalho, IDs únicos e cronologia estrita',()=>{
 const good='id;data_hora_iso;resultado_x\na;2026-10-24T10:00:00-03:00;2,5\nb;2026-10-24T10:00:30-03:00;1.12';
 const imported=parseGoldRoundsCsv(good);
 assert.deepEqual(imported.map(x=>x.multiplier),[2.5,1.12]);
 assert.throws(()=>parseGoldRoundsCsv(good.replace('b;','a;')),/repetido/);
 assert.throws(()=>parseGoldRoundsCsv(good.replace('10:00:30','09:59:30')),/crescentes/);
 assert.throws(()=>parseGoldRoundsCsv(good.replace('1.12','=-3')),/Linha/);
 assert.throws(()=>parseGoldRoundsCsv('id;round;result\n'+good.split('\n').slice(1).join('\n')),/Cabeçalho/);
 assert.throws(()=>parseGoldRoundsCsv('id;data_hora_iso;resultado_x\na;2026-10-24T10:00:00-03:00;2'),/entre 2/);
});

test('walk-forward só libera quando há 50 encerradas e sessão confirmada',()=>{
 const confirmed=compareGoldOffline(rows(65),REFINED_DEFAULT,true);
 assert.equal(confirmed.rounds,65);
 assert.equal(confirmed.source,'offline-import');
 const low=confirmed.summary.find(x=>x.profile==='Refinado'&&x.indicator==='BAIXA');
 assert.equal(low?.released,15);
 assert.equal(low?.thresholdReached,15);
 assert.equal(low?.hitRate,1);
 const pending=compareGoldOffline(rows(65),REFINED_DEFAULT,false);
 assert.equal(pending.summary.find(x=>x.profile==='Gold'&&x.indicator==='BAIXA')?.released,0);
 assert.equal(pending.decisions.filter(x=>x.state==='liberado').length,0);
});

test('Clássico é referência de alvo, não inventa filtro legado nem acertos',()=>{
 const result=compareGoldOffline(rows(70),REFINED_DEFAULT,true);
 const classic=result.summary.filter(x=>x.profile==='Clássico');
 assert.equal(classic.length,3);
 assert.ok(classic.every(x=>x.released===0&&x.hitRate===null));
 assert.ok(result.decisions.filter(x=>x.profile==='Clássico').every(x=>x.thresholdReached===null));
});

test('resultados futuros não alteram alvo ou decisão feita antes da rodada',()=>{
 const baseline=rows(70,2.5),changed=rows(70,2.5);
 changed[69]={...changed[69],multiplier:100};
 const base=compareGoldOffline(baseline,REFINED_DEFAULT,true);
 const modified=compareGoldOffline(changed,REFINED_DEFAULT,true);
 const select=x=>x.decisions.filter(d=>d.nextId==='r69').map(d=>[d.profile,d.indicator,d.target,d.state]);
 assert.deepEqual(select(base),select(modified));
 assert.equal(base.decisions.find(x=>x.profile==='Gold'&&x.indicator==='BAIXA'&&x.nextId==='r69')?.observed,2.5);
 assert.equal(modified.decisions.find(x=>x.profile==='Gold'&&x.indicator==='BAIXA'&&x.nextId==='r69')?.observed,100);
});

test('interrupção entre rodadas não vira uma decisão executável',()=>{
 const sample=rows(60);
 sample[55]={...sample[55],at:new Date(Date.parse(sample[54].at)+301000).toISOString()};
 for(let i=56;i<60;i++)sample[i]={...sample[i],at:new Date(Date.parse(sample[55].at)+(i-55)*30000).toISOString()};
 const result=compareGoldOffline(sample,REFINED_DEFAULT,true);
 assert.equal(result.decisions.find(x=>x.profile==='Gold'&&x.indicator==='BAIXA'&&x.nextId==='r55')?.state,'descartado_gap');
 assert.equal(result.decisions.find(x=>x.profile==='Gold'&&x.indicator==='BAIXA'&&x.nextId==='r56')?.state,'historico_incompleto');
});

test('Gold padrão e Refinado calculam o mesmo alvo, sem garantia de lucro',()=>{
 const result=compareGoldOffline(rows(65),REFINED_DEFAULT,true);
 for(const indicator of ['BAIXA','MEDIANA','ALTA']){
  const gold=result.summary.find(x=>x.profile==='Gold'&&x.indicator===indicator);
  const refined=result.summary.find(x=>x.profile==='Refinado'&&x.indicator===indicator);
  assert.deepEqual({...gold,profile:'Refinado'},refined);
 }
 assert.match(result.disclaimer,/sem apostas/);
});
test('CSV só contém decisões, resultado e indicação de limiar; sem cobrança ou dados pessoais',()=>{
 const result=compareGoldOffline(rows(54),REFINED_DEFAULT,true);
 const exportText=goldComparisonCsv(result);
 assert.match(exportText,/last_closed_id;next_round_id/);
 assert.match(exportText,/rule_version/);
 assert.match(exportText,/r53/);
 assert.doesNotMatch(exportText,/email|telefone|payment|checkout|Pix/);
});

test('comparador restrito ao admin e módulo sem ligação com pagamentos ou Android',()=>{
 const route=read('app/admin/gold/comparador/page.tsx');
 const ui=read('components/gold/GoldComparisonWorkbench.tsx');
 const styles=read('app/admin/gold/comparador/comparator.css');
 assert.match(route,/requireAdmin\(\)/);
 assert.match(route,/role!=='admin'&&role!=='owner'/);
 assert.match(route,/\.eq\('user_id',customerId\)/);
 assert.match(ui,/setSessionConfirmed/);
 assert.match(ui,/goldComparisonCsv\(result\)/);
 assert.doesNotMatch(route+ui,/\/api\/pix\/create|\/api\/apostas|service_role/i);
 assert.match(styles,/@media\(max-width:600px\)/);
});
