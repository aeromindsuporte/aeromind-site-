import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('a nova página utiliza o layout neon aprovado em vez do landing legado',()=>{
 const page=read('app/page.tsx');
 assert.match(page,/import '\.\/landing-neon\.css'/);
 assert.match(page,/Mais clareza/);
 assert.match(page,/no Aviator/);
 assert.match(page,/Indicador de Crash/);
 assert.match(page,/Indicador de minutos de rosa/);
 assert.match(page,/Resultados dos indicadores de rosa/);
 assert.match(page,/className="nl-feature-wrap/);
 assert.doesNotMatch(page,/landing\.html|dangerouslySetInnerHTML/);
});

test('todos os CTAs de compra abrem a lista real de planos',()=>{
 const page=read('app/page.tsx');
 const matches=[...page.matchAll(/<Link href="\/planos"/g)];
 assert.ok(matches.length>=4,'CTA de cabeçalho, herói e demais chamadas devem apontar /planos');
 assert.match(read('app/planos/page.tsx'),/\/checkout\?plano=/);
 assert.match(read('app/checkout/page.tsx'),/if\(!slug\)redirect\('\/planos'\)/);
});

test('menu do design aprovado tem âncoras válidas e entrada para planos',()=>{
 const page=read('app/page.tsx');
 for(const id of ['inicio','funcionalidades','como-funciona','depoimentos']){
   assert.ok(page.includes('id="'+id+'"'),'Seção ausente: '+id);
   assert.ok(page.includes('href="#'+id+'"'),'Navegação ausente: '+id);
 }
 assert.match(page,/AeroMark/);
 assert.match(page,/nl-mobile-menu/);
});

test('demonstração preserva os valores e identifica que são ilustrativos',()=>{
 const page=read('app/page.tsx');
 for(const value of ['1.58x','2.16x','3.03x','20.59x','150.38x','55m']){
   assert.ok(page.includes(value),'Multiplicador/minuto ausente: '+value);
 }
 assert.match(page,/Multiplicadores ilustrativos|multiplicadores ilustrativos/i);
 assert.match(page,/não garantem resultados futuros/i);
});

test('CSS é isolado e responsivo para computador e celular',()=>{
 const css=read('app/landing-neon.css');
 assert.match(css,/\.nl-site\{/);
 assert.match(css,/\.nl-phone\{/);
 assert.match(css,/\.nl-feature-wrap\{/);
 assert.match(css,/@media\(max-width:1120px\)/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(max-width:510px\)/);
 assert.match(css,/\.nl-hero-content\{grid-template-columns:1fr/);
 assert.match(css,/overflow-x:clip/);
 assert.match(css,/prefers-reduced-motion/);
});


test('visual mobile preserva três demonstrações compactas ao lado dos textos',()=>{
 const css=read('app/landing-neon.css');
 assert.match(css,/V3 MOBILE/);
 assert.match(css,/@media\(max-width:860px\)/);
 assert.match(css,/\.nl-feature-card\{display:grid;grid-template-columns:minmax\(0,44%\) minmax\(0,56%\)/);
 assert.match(css,/\.nl-feature-card\{grid-template-columns:minmax\(0,43%\) minmax\(0,57%\)/);
 assert.match(css,/\.nl-feature-card\{grid-template-columns:minmax\(0,43%\)[^}]*min-height:190px/);
 assert.match(css,/\.nl-mini-crash\{height:168px/);
 assert.match(css,/\.nl-mini-rose\{height:174px/);
 assert.match(css,/\.nl-mini-results\{height:172px/);
 assert.match(css,/\.nl-stage\{height:360px/);
 assert.match(css,/transform:rotate\(6deg\) scale\(\.58\)/);
 assert.match(css,/@media\(max-width:355px\)/);
});

test('landing não interfere nos planos e ainda mantém a chamada à compra',()=>{
 const page=read('app/page.tsx');
 const css=read('app/landing-neon.css');
 assert.match(page,/<Link href="\/planos" className="nl-btn nl-btn-header"/);
 assert.match(page,/<Link href="\/planos" className="nl-btn nl-btn-primary"/);
 assert.ok(css.includes('.nl-site'));
 assert.ok(!css.includes('.account-root{'));
 assert.ok(!css.includes('.admin-root{'));
});
