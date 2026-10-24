import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('app/admin/gold/page.tsx');
const history=read('app/admin/gold/GoldClientHistory.tsx');
const actions=read('app/admin/gold/actions.ts');
const css=read('app/admin/gold/gold-admin.css');

test('busca do Gold usa consulta de clientes autenticada e valida a seleção',()=>{
 assert.match(page,/requireAdmin\(\)/);
 assert.match(page,/role!=='admin'&&role!=='owner'/);
 assert.match(page,/aeromind_admin_search_customers/);
 assert.match(page,/p_query:term,p_offset:0/);
 assert.match(page,/uuid\.test\(cliente\)/);
 assert.match(page,/aeromind_admin_customer_v3/);
 assert.match(page,/term\.length>=2/);
});
test('histórico Gold consulta somente o cliente escolhido com limites definidos',()=>{
 for(const table of ['aeromind_gold_access','aeromind_gold_config_versions','aeromind_gold_audit']){
  assert.ok(page.includes("from('"+table+"')"),table);
 }
 assert.match(page,/\.eq\('user_id',selected\.id\)/);
 assert.match(page,/\.limit\(50\)/);
 assert.match(history,/validateGoldSettings\(value\)/);
 assert.match(history,/Versões das configurações/);
 assert.match(history,/Auditoria do cliente/);
});
test('edições só usam ações auditáveis pré-existentes e preservam o cliente selecionado',()=>{
 assert.match(page,/GoldConfigForm email=\{selected\?\.email/);
 assert.match(page,/name="return_client"/);
 assert.match(actions,/uuid\.test\(client\)/);
 assert.match(actions,/aeromind_gold_admin_set_access/);
 assert.match(actions,/aeromind_gold_admin_save_config/);
 assert.doesNotMatch(page,/aeromind_gold_access'\)\.update/);
 assert.doesNotMatch(page,/\/api\/pix\/create/);
});
test('layout do Gold continua adaptável ao celular',()=>{
 assert.match(css,/gold-find-form/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/gold-version summary/);
});
