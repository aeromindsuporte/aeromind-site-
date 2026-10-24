import test from 'node:test';
import assert from 'node:assert/strict';
import {simulateGold} from '../lib/gold/simulator.ts';
const options={initialCents:100000,entry:{kind:'fixed',cents:1000},minEntryCents:100,
 dailyProfit:{kind:'fixed',cents:5000},dailyLoss:{kind:'fixed',cents:5000},timeZone:'America/Sao_Paulo'};
const make=(id,day,status,target=1.58)=>({id,day,released:true,status,target,origin:'backtest'});
test('G10: banca virtual calcula centavos, operação e queda',()=>{
 const r=simulateGold([make('1','2025-07-01','win'),make('2','2025-07-01','loss')],options);
 assert.equal(r.finalCents,99580);
 assert.deepEqual(r.operations.map(o=>o.pnlCents),[580,-1000]);
 assert.equal(r.maxDrawdownCents,1000);
 assert.equal(r.wins,1);assert.equal(r.losses,1);
 assert.equal(r.hitRate,0.5);
 assert.equal(r.days[0].openCents,100000);
 assert.equal(r.days[0].closeCents,99580);
});
test('G10: meta alcançada impede entradas adicionais naquele dia; dia seguinte reutiliza saldo',()=>{
 const o={...options,dailyProfit:{kind:'fixed',cents:500}};
 const r=simulateGold([make('1','2025-07-01','win'),make('2','2025-07-01','loss'),
  make('3','2025-07-02','loss')],o);
 assert.equal(r.operationsCount,2);
 assert.deepEqual(r.operations.map(x=>x.signalId),['1','3']);
 assert.equal(r.days[0].reason,'profit');
 assert.equal(r.days[1].openCents,100580);
 assert.equal(r.finalCents,99580);
 assert.equal(r.profitDays,1);
});
test('G10: limite de perda diário impede novas operações; não apaga sinais',()=>{
 const o={...options,dailyLoss:{kind:'fixed',cents:1000}};
 const r=simulateGold([make('a','2025-07-01','loss'),make('b','2025-07-01','win'),
  make('c','2025-07-02','win')],o);
 assert.equal(r.released,3);
 assert.equal(r.operationsCount,2);
 assert.equal(r.lossDays,1);
 assert.deepEqual(r.operations.map(x=>x.signalId),['a','c']);
});
test('G10: entrada percentual usa saldo antes do resultado',()=>{
 const r=simulateGold([make('1','2025-07-01','win',1.5)],{...options,entry:{kind:'percent',percent:2}});
 assert.equal(r.operations[0].stakeCents,2000);
 assert.equal(r.operations[0].pnlCents,1000);
 assert.equal(r.finalCents,101000);
});
test('G10: HALF_UP monetário para meio centavo',()=>{
 const r=simulateGold([make('1','2025-07-01','win',1.005)],{...options,entry:{kind:'fixed',cents:101}});
 assert.equal(r.operations[0].pnlCents,1);
});
test('G11: sem sinais resolvidos não fabrica resultados',()=>{
 const r=simulateGold([make('p','2025-07-01','pending'),make('i','2025-07-01','invalidated')],options);
 assert.equal(r.operationsCount,0);assert.equal(r.pending,1);assert.equal(r.invalidated,1);
 assert.equal(r.hitRate,null);assert.equal(r.finalCents,100000);assert.equal(r.noOperationDays,1);
});
test('G11: saldo insuficiente não força entrada mínima',()=>{
 const r=simulateGold([make('1','2025-07-01','win')],{...options,minEntryCents:1001});
 assert.equal(r.operationsCount,0);assert.equal(r.days[0].reason,'insufficient');
});
test('G11: rejeita valores e ordem inválidos',()=>{
 assert.throws(()=>simulateGold([], {...options,entry:{kind:'percent',percent:0}}));
 assert.throws(()=>simulateGold([], {...options,minEntryCents:-1}));
 assert.throws(()=>simulateGold([make('2','2025-07-02','win'),make('1','2025-07-01','loss')],options));
});

test('G06/G11: sinal duplicado não gera duas operações nem altera banca indevidamente',()=>{
 const one=make('mesmo-sinal','2025-07-01','win');
 assert.throws(()=>simulateGold([one,one],options),/duplicado/);
});
