import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Básico, Pró e Gold preservam os quatro períodos no catálogo',()=>{
 const page=read('app/planos/page.tsx');
 for(const period of ["{slug:'mensal',days:30","{slug:'trimestral',days:90","{slug:'semestral',days:180","{slug:'anual',days:365"]){
  assert.ok(page.includes(period),'Duração ausente: '+period);
 }
 assert.match(page,/tier:'Básico'/);
 assert.match(page,/tier:'Pro'/);
 assert.match(page,/tier:'Ultra'/);
 assert.match(page,/card.tier==='Ultra'\?'Gold'/);
 assert.match(page,/Radar Rosa: até 7 sinais por hora/);
});

test('Gold tem oferta real pelo catálogo, sem alterar o tier interno Ultra',()=>{
 const page=read('app/planos/page.tsx'),catalog=read('lib/catalog.ts');
 assert.match(page,/const plan=planData.find/);
 assert.match(page,/plan\?<Link href=\{'\/checkout\?plano='\+encodeURIComponent\(plan\.slug\)\}/);
 assert.match(page,/effectivePriceCents\(plan\)/);
 assert.match(catalog,/tier: 'Básico' \| 'Pro' \| 'Ultra'/);
 assert.doesNotMatch(catalog,/tier: 'Básico' \| 'Pro' \| 'Gold'/);
});

test('página Gold oferece os períodos realmente publicados e informa recursos em implantação',()=>{
 const page=read('app/gold/page.tsx');
 assert.match(page,/getVisiblePlans/);
 assert.match(page,/offers=plans.filter\(p=>p.tier==='Ultra'/);
 assert.match(page,/href=\{'\/checkout\?plano='\+encodeURIComponent\(plan\.slug\)\}/);
 assert.match(page,/Comunidade Gold VIP/);
 assert.match(page,/em implantação/);
 assert.match(page,/50x/);
 const css=read('app/gold/gold.css');
 assert.match(css,/\.ag-mode-grid/);
});


test('planos distinguem benefício incluído, exclusivo Gold e benefício em implantação',()=>{
 const page=read('app/planos/page.tsx'), css=read('public/design-v2.css');
 assert.match(page,/function formatBenefits\(/);
 assert.match(page,/function BenefitList\(/);
 assert.match(page,/feature-state/);
 assert.match(page,/item\.state==='locked'\?'✕'/);
 assert.match(page,/item\.state==='included'\?'✓'/);
 assert.match(page,/item\.state==='locked'\?'Só no Gold':'Em implantação'/);
 assert.match(page,/alto risco e agenda completa/i);
 assert.match(page,/goldOnlyExtras/);
 assert.match(page,/futureBenefit/);
 assert.match(page,/BenefitList tier=\{card.tier\}/);
 assert.doesNotMatch(page,/<li key=\{i\}>✓ \{feature\}<\/li>/);
 assert.match(css,/\.am-plan \.am-plan-feature-list > li::before\{content:none!important;display:none!important\}/);
 assert.match(css,/\.am-feature-locked \.am-feature-state/);
 assert.match(css,/\.am-feature-planned \.am-feature-state/);
 assert.match(css,/\.am-feature-included|\.am-feature-state/);
 assert.match(page,/Deslize para o lado/);
});
