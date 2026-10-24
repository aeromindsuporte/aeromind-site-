import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateGoldSettings,REFINED_DEFAULT} from '../lib/gold/indicators.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261024180000_gold_entitlements_isolated.sql');

test('Gold separado: tabelas aditivas, nenhuma migração/UPDATE de licenças existentes',()=>{
 for(const table of ['aeromind_gold_access','aeromind_gold_config_versions','aeromind_gold_audit','aeromind_gold_rollout']){
  assert.match(sql,new RegExp('create table if not exists (public|private)\\.'+table));
 }
 assert.ok(!/\b(?:delete\s+from|update|truncate\s+table|drop\s+table)\s+(?:public\.)?(?:licenses|aeromind_plan_catalog|aeromind_payment_orders)\b/i.test(sql));
 assert.match(sql,/values\(true,false,false\)/);
 assert.match(sql,/enabled boolean not null default false/);
 assert.match(sql,/checkout_enabled boolean not null default false/);
});

test('Gold: RLS aplicado em todas tabelas e sem escrita via API para clientes',()=>{
 for(const table of ['public.aeromind_gold_access','public.aeromind_gold_config_versions','public.aeromind_gold_audit','private.aeromind_gold_rollout']){
  assert.ok(sql.includes('alter table '+table+' enable row level security'),table);
  assert.ok(sql.includes('revoke all on '+table+' from public, anon, authenticated'),table);
 }
 assert.match(sql,/grant select on public.aeromind_gold_access to authenticated/);
 assert.match(sql,/gold_access_self_or_staff/);
 assert.match(sql,/gold_audit_staff_only/);
 assert.doesNotMatch(sql,/grant (?:insert|update|delete|all) on (?:public\.aeromind_gold_access|public\.aeromind_gold_config_versions|public\.aeromind_gold_audit) to authenticated/i);
});
test('Ações exigem autenticação e repetem autorização do funcionário no banco',()=>{
 const actions=read('app/admin/gold/actions.ts');
 assert.match(actions,/requireAdmin\(\)/);
 assert.match(actions,/aeromind_gold_admin_set_access/);
 assert.match(actions,/aeromind_gold_admin_save_config/);
 for(const name of ['aeromind_gold_admin_set_access','aeromind_gold_admin_save_config','aeromind_gold_admin_overview']){
  const part=sql.split('create or replace function public.'+name+'(')[1];
  assert.ok(part,'RPC ausente: '+name);
  assert.match(part.slice(0,1000),/security definer set search_path=''/);
  assert.match(part.slice(0,1700),/auth\.uid\(\)/);
  assert.match(part.slice(0,1800),/public\.aeromind_staff/);
  assert.match(sql,new RegExp('revoke all on function public\\.'+name+'\\('));
 }
});
test('Grants, revogações e edição de configuração sempre geram auditoria',()=>{
 assert.match(sql,/action in \('access_granted','access_revoked','config_saved'\)/);
 assert.match(sql,/on conflict\(user_id\) do update/);
 assert.match(sql,/perform pg_advisory_xact_lock/);
 assert.match(sql,/unique\(user_id,version\)/);
 assert.match(sql,/gold_settings_catalog_check/);
 assert.match(sql,/insert into public\.aeromind_gold_audit\(user_id,actor_id,action/);
 assert.match(sql,/values\(target_user,actor,'config_saved'/);
 assert.ok(validateGoldSettings(REFINED_DEFAULT));
});
test('Nenhuma ativação Gold sem licença BASE válida e rollout deliberadamente ligado',()=>{
 assert.match(sql,/l\.status='active' and l\.valid_until>now\(\)/);
 assert.match(sql,/coalesce\(enabled_flag,false\)/);
 assert.match(sql,/coalesce\(gold\.enabled,false\)/);
 assert.match(sql,/gold\.valid_until>now\(\)/);
 assert.match(sql,/has_base and coalesce\(enabled_flag,false\)/);
 assert.match(sql,/checkout_enabled boolean not null default false/);
});
test('Painel real oferece concessão, revogação, versão e histórico sem mexer em Pix',()=>{
 const page=read('app/admin/gold/page.tsx');
 assert.match(page,/saveGoldAccess/);
 assert.match(page,/saveGoldConfiguration/);
 assert.match(page,/Gerenciamento Gold/);
 assert.match(page,/Conceder autorização/);
 assert.match(page,/Revogar autorização/);
 assert.match(page,/Histórico de alterações/);
 assert.match(page,/valid_until/);
 assert.match(page,/global_enabled/);
 assert.match(page,/checkout_enabled/);
 assert.doesNotMatch(page,/aeromind_payment_orders.*\.update|\/api\/pix\/create/);
 const css=read('app/admin/gold/gold-admin.css');
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/@media\(max-width:380px\)/);
});
