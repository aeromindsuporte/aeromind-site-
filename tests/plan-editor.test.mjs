import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePlanEditorForm} from '../lib/admin/plan-editor-input.ts';

function form(values={}){
 const f=new FormData();
 const fields={slug:'teste-horas',quantity:'1',price:'0.00',free_trial:'on',
  visible:'on',title:'Teste Grátis',description:'Experimente o monitor',
  badge:'',features:'Monitoramento Básico\nHistórico do aplicativo\nAcesso por tempo definido',
  cta:'Iniciar teste',duration_caption:'por 1 hora',unpriced_label:'',
  highlight:'',...values};
 for(const [k,v] of Object.entries(fields))if(v!==null)f.set(k,String(v));
 return f;
}
test('gratuito por hora: preço é zero, publicado, sem Pix',()=>{
 const result=parsePlanEditorForm(form());
 assert.equal(result.ok,true);
 if(!result.ok)return;
 assert.equal(result.value.p_price_cents,0);
 assert.equal(result.value.p_visible,true);
 assert.equal(result.value.p_trial_quantity,1);
 assert.equal(result.value.p_slug,'teste-horas');
 assert.deepEqual(result.value.p_features,['Monitoramento Básico','Histórico do aplicativo','Acesso por tempo definido']);
});
test('gratuito por dias aceita 30 dias',()=>{
 const result=parsePlanEditorForm(form({slug:'teste-dias',quantity:'30'}));
 assert.equal(result.ok,true);
 if(result.ok)assert.equal(result.value.p_trial_quantity,30);
});
test('marcador gratuito define zero mesmo com preço antigo',()=>{
 const result=parsePlanEditorForm(form({free_trial:'on',price:'20.00'}));
 assert.equal(result.ok,true);
 if(result.ok)assert.equal(result.value.p_price_cents,0);
});
test('teste com valor zero é gratuito mesmo que o checkbox falhe na serialização',()=>{
 const result=parsePlanEditorForm(form({free_trial:''}));
 assert.equal(result.ok,true);
 if(result.ok)assert.equal(result.value.p_price_cents,0);
});
test('não aceita teste pago de R$1,99',()=>{
 assert.deepEqual(parsePlanEditorForm(form({free_trial:'',price:'1.99'})),{ok:false,code:'plan-price'});
});
test('não transforma plano mensal comercial em gratuito',()=>{
 assert.deepEqual(parsePlanEditorForm(form({slug:'basico-mensal',quantity:'',free_trial:'on',price:'0.00'})),{ok:false,code:'plan-price'});
});
test('mantém um plano comercial a R$2,00',()=>{
 const r=parsePlanEditorForm(form({slug:'basico-mensal',quantity:'',free_trial:'',price:'2.00'}));
 assert.equal(r.ok,true);
 if(r.ok)assert.equal(r.value.p_price_cents,200);
});
test('validade do teste é obrigatória e tem limites',()=>{
 assert.deepEqual(parsePlanEditorForm(form({quantity:''})),{ok:false,code:'plan-duration'});
 assert.deepEqual(parsePlanEditorForm(form({quantity:'73'})),{ok:false,code:'plan-duration'});
 assert.deepEqual(parsePlanEditorForm(form({slug:'teste-dias',quantity:'31'})),{ok:false,code:'plan-duration'});
});
test('benefícios em excesso recebem mensagem específica',()=>{
 const features=Array(9).fill('Acesso do monitor').join('\n');
 assert.deepEqual(parsePlanEditorForm(form({features})),{ok:false,code:'plan-benefits'});
});
test('textos grandes recebem erro próprio e campos não se perdem',()=>{
 assert.deepEqual(parsePlanEditorForm(form({title:'x'.repeat(66)})),{ok:false,code:'plan-text'});
 const r=parsePlanEditorForm(form({description:'Acesso Básico',cta:'Ativar gratuitamente',highlight:'on'}));
 assert.equal(r.ok,true);
 if(r.ok){assert.equal(r.value.p_description,'Acesso Básico');assert.equal(r.value.p_cta,'Ativar gratuitamente');assert.equal(r.value.p_highlight,true);}
});
