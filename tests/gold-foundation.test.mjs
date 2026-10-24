import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {percentileHalfUp,column7,target,filterPassed,validateGoldSettings,goldRule,evaluateGoldOrRefined,canUseGold,REFINED_DEFAULT,CLASSIC_TARGETS} from '../lib/gold/indicators.ts';

test('G03: Clássico preserva percentis da coluna 7',()=>{
 const values=Array(49).fill(1);
 [1.37,2.23,1.19,3.30,1.26].forEach((v,i)=>values[49-7*(i+1)]=v);
 const sample=column7(values,5);
 assert.deepEqual(sample,[1.37,2.23,1.19,3.3,1.26]);
 assert.equal(target(values,CLASSIC_TARGETS.BAIXA),1.26);
 assert.equal(target(values,CLASSIC_TARGETS.MEDIANA),1.37);
 assert.equal(target(values,CLASSIC_TARGETS.ALTA),2.23);
 assert.equal(percentileHalfUp([1,1.01],50),1.01,'decimal HALF_UP');
});
test('G02: Gold padrão é o Refinado e não altera MEDIANA',()=>{
 for(const indicator of ['BAIXA','MEDIANA','ALTA']){
  assert.deepEqual(goldRule(indicator),REFINED_DEFAULT[indicator]);
 }
 const sample=Array.from({length:65},(_,i)=>i%3===0?10:2.5);
 const safe={consecutiveConfirmed:65,continuityValid:true,gapSeconds:1,sessionValidated:true};
 for(const indicator of ['BAIXA','MEDIANA','ALTA']){
  const refined=evaluateGoldOrRefined(sample,indicator,'Refinado',safe);
  const gold=evaluateGoldOrRefined(sample,indicator,'Gold',safe);
  assert.equal(refined.target,gold.target);
  assert.equal(refined.state,gold.state);
 }
});
test('G04 e G05: 10x não é roxo; pagantes incluem rosas e limites são inclusivos',()=>{
 const purple=[2,2.1,3,4,2,9.99,10,1,1.5,1];
 assert.equal(filterPassed(purple,{mode:'purple_count',k:6}),true);
 assert.equal(filterPassed(purple,{mode:'purple_count',k:7}),false);
 assert.equal(filterPassed(purple,{mode:'continuous'}),true);
 const paying=[1,1,2,2,10,2,2,10,1,2,2,2,2];
 assert.equal(filterPassed(paying,{mode:'paying_counts',a:9,b:3}),true);
 assert.equal(filterPassed(paying,{mode:'paying_counts',a:10,b:3}),true);
 assert.equal(filterPassed(paying,{mode:'paying_counts',a:9,b:4}),true);
 const improving=[...Array(10).fill(1),...Array(5).fill(2),...Array(5).fill(1)];
 assert.equal(filterPassed(improving,{mode:'purple_improving',k:5}),true);
 const notImproving=[...Array(5).fill(2),...Array(5).fill(1),...Array(5).fill(2),...Array(5).fill(1)];
 assert.equal(filterPassed(notImproving,{mode:'purple_improving',k:5}),false);
});
test('G05: bloquear filtros/regras Gold não catalogados',()=>{
 assert.equal(validateGoldSettings(REFINED_DEFAULT),true);
 assert.equal(validateGoldSettings({...REFINED_DEFAULT,ALTA:{target:'column7_4_p75',filter:{mode:'continuous'}}}),false);
 assert.equal(validateGoldSettings({...REFINED_DEFAULT,MEDIANA:{target:'low35',filter:{mode:'continuous'}}}),false);
 assert.equal(validateGoldSettings({...REFINED_DEFAULT,BAIXA:{target:'low35',filter:{mode:'purple_count',k:8}}}),false);
 assert.equal(validateGoldSettings({...REFINED_DEFAULT,BAIXA:{target:'low35',filter:{mode:'continuous'},unknown:'hidden'}}),false);
 assert.equal(filterPassed(Array(20).fill(2),{mode:'purple_count',k:8}),null);
});
test('G07: limite 300s não é quebra, 301s bloqueia; sem 50 resultados não libera',()=>{
 const sample=Array(60).fill(2.3);
 const safe={consecutiveConfirmed:60,continuityValid:true,gapSeconds:300,sessionValidated:true};
 const at300=evaluateGoldOrRefined(sample,'BAIXA','Gold',safe);
 assert.equal(at300.state,'liberado');
 assert.equal(evaluateGoldOrRefined(sample,'BAIXA','Gold',{...safe,gapSeconds:301}).state,'historico_incompleto');
 assert.equal(evaluateGoldOrRefined(sample,'BAIXA','Gold',{...safe,consecutiveConfirmed:49}).state,'historico_incompleto');
 assert.equal(evaluateGoldOrRefined(sample,'BAIXA','Gold',{...safe,continuityValid:false}).state,'historico_incompleto');
});
test('G01/G12/G14/G17: acesso Gold é cumulativo e nunca derivado do texto Premium/Pro',()=>{
 const input={appAccess:true,goldAccess:true,accountSuspended:false,goldEnabled:true};
 assert.equal(canUseGold(input),true);
 assert.equal(canUseGold({...input,appAccess:false}),false);
 assert.equal(canUseGold({...input,goldAccess:false}),false);
 assert.equal(canUseGold({...input,goldEnabled:false}),false);
 assert.equal(canUseGold({...input,accountSuspended:true}),false);
});
test('Site Gold informa EM BREVE e não integra checkout Gold',()=>{
 const page=readFileSync(new URL('../app/gold/page.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../app/gold/gold.css',import.meta.url),'utf8');
 assert.match(page,/GOLD EM PREPARAÇÃO/);
 assert.match(page,/SEM VENDA ATIVA/);
 assert.match(page,/18\+/);
 assert.match(page,/Sem garantia de acertos ou ganhos/);
 assert.match(page,/Clássico/);
 assert.match(page,/Refinado/);
 assert.match(page,/Gold/);
 assert.match(page,/\/planos/);
 assert.doesNotMatch(page,/\/checkout\?plano=gold|\/api\/pix\/create|pagamento Gold disponível/i);
 assert.match(css,/@media\(max-width:580px\)/);
});
