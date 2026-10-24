import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('planos mostram Gold no lugar do card comercial Ultra, em todos os períodos',()=>{
 const page=read('app/planos/page.tsx');
 for(const p of ["{slug:'mensal',days:30","{slug:'trimestral',days:90","{slug:'semestral',days:180","{slug:'anual',days:365"]){
  assert.ok(page.includes(p),'Duração ausente: '+p);
 }
 assert.match(page,/cards\.map\(card=>\{/);
 assert.match(page,/if\(card\.tier==='Ultra'\)return <Link key=\{card\.tier\} href="\/gold"/);
 assert.match(page,/<h3>Gold<\/h3>/);
 assert.match(page,/Conhecer Gold/);
 assert.match(page,/className=\{'am-plan '\+card\.css\+' am-gold-preview'\}/);
 assert.match(page,/aria-label="Conhecer o AeroMind Gold/);
 assert.ok(page.indexOf("if(card.tier==='Ultra')")<page.indexOf("const plan=planData.find"),'Gold não depende de plano Ultra publicado');
});
test('Gold não gera cobrança nem altera tiers legados, e venda existente continua funcionando',()=>{
 const page=read('app/planos/page.tsx'),catalog=read('lib/catalog.ts');
 const branch=page.split("if(card.tier==='Ultra')return <Link")[1].split("const plan=planData.find")[0];
 assert.doesNotMatch(branch,/\/checkout|formattedPrice|plan\.price_cents|Indisponível/);
 assert.match(branch,/EM PREPARAÇÃO/);
 assert.match(branch,/Venda ainda não disponível/);
 assert.match(page,/tier:'Básico'/);
 assert.match(page,/tier:'Pro'/);
 assert.match(page,/tier:'Ultra'/);
 assert.match(page,/plan\?<Link href=\{'\/checkout\?plano='\+encodeURIComponent\(plan\.slug\)\}/);
 assert.match(catalog,/tier: 'Básico' \| 'Pro' \| 'Ultra'/);
 assert.doesNotMatch(catalog,/tier: 'Básico' \| 'Pro' \| 'Gold'/);
});
test('página de destino Gold está disponível, sem oferta ativa',()=>{
 const target=read('app/gold/page.tsx');
 assert.match(target,/GOLD EM PREPARAÇÃO/);
 assert.match(target,/SEM VENDA ATIVA/);
 assert.match(target,/\/planos/);
 const css=read('public/design-v2.css');
 assert.match(css,/\.am-site \.am-gold-preview/);
 assert.match(css,/\.am-gold-preview:is\(:hover,:focus-visible\)/);
 assert.match(css,/prefers-reduced-motion/);
});
