import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parsePlanEditorForm} from '../lib/admin/plan-editor-input.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const form=(extra={})=>{
 const values={slug:'basico-mensal',price:'39.90',duration_days:'30',free_trial:'',
  title:'AeroMind Essencial',description:'Leitura e histórico',badge:'LANÇAMENTO',
  features:'Painel de monitoramento\nHistórico',cta:'Escolher',duration_caption:'por 30 dias',
  unpriced_label:'',visible:'',quantity:'',flash_price:'',flash_ends_at:'',flash_label:'',...extra};
 const fd=new FormData();for(const [k,v]of Object.entries(values))fd.set(k,String(v));return fd;
};
test('dias comerciais personalizados e meses convertidos são enviados no mesmo RPC',()=>{
 const r=parsePlanEditorForm(form({duration_days:'45'}));
 assert.equal(r.ok,true);
 if(r.ok)assert.equal(r.value.p_duration_days,45);
 assert.deepEqual(parsePlanEditorForm(form({duration_days:'731'})),{ok:false,code:'plan-duration'});
 assert.deepEqual(parsePlanEditorForm(form({duration_days:'0'})),{ok:false,code:'plan-duration'});
 const action=read('app/admin/actions.ts');
 assert.match(action,/aeromind_save_plan_editor_v3/);
 assert.match(read('components/admin/PlansCatalogEditor.tsx'),/monthsToDays/);
});
test('oferta exige preço menor que o regular e data de término',()=>{
 const r=parsePlanEditorForm(form({flash_price:'29.90',flash_ends_at:'2026-11-08T23:59',flash_label:'Lançamento'}));
 assert.equal(r.ok,true);
 if(r.ok){
  assert.equal(r.value.p_flash_price_cents,2990);
  assert.equal(r.value.p_flash_ends_at,'2026-11-09T02:59:00.000Z');
 }
 assert.deepEqual(parsePlanEditorForm(form({flash_price:'45.90',flash_ends_at:'2026-11-08T23:59'})),{ok:false,code:'plan-price'});
 assert.deepEqual(parsePlanEditorForm(form({flash_price:'29.90'})),{ok:false,code:'plan-price'});
});
test('editor em portal fica acima do menu administrativo no celular',()=>{
 const src=read('components/admin/PlansCatalogEditor.tsx');
 const css=read('app/admin/planos/plans-v2.css');
 assert.match(src,/createPortal/);
 assert.match(src,/document\.body/);
 assert.match(css,/\.pv2-backdrop\{z-index:16000/);
 assert.match(src,/role="dialog"/);
});
test('banco protege licenças e valor efetivo de pagamento',()=>{
 const sql=read('supabase/migrations/20261101130000_plan_editor_duration_flash.sql');
 assert.match(sql,/private\.aeromind_verified_staff\(\)/);
 assert.match(sql,/p_duration_days/);
 assert.match(sql,/aeromind_plan_edit_audit/);
 assert.match(sql,/aeromind_plan_duration_sync/);
 assert.match(sql,/extension_days:=greatest\(0/);
 assert.match(sql,/v_price:=case when v_plan\.flash_price_cents/);
 assert.match(read('lib/catalog.ts'),/effectivePriceCents/);
 assert.match(read('app/checkout/page.tsx'),/effectivePriceCents\(plan\)/);
});
