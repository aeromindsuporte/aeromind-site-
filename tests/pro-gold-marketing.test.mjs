import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261025130000_aeromind_pro_gold_campaigns.sql');
const fix=read('supabase/migrations/20261025131000_fix_campaign_save_returning.sql');

test('Pro e Gold possuem páginas comerciais independentes e a landing liga para ambas',()=>{
 const home=read('app/page.tsx'),pro=read('app/pro/page.tsx'),gold=read('app/gold/page.tsx');
 assert.match(home,/getPublicCampaigns/);
 assert.match(home,/id="versoes"/);
 assert.match(home,/href=\{c.tier==='Gold'\?'\/gold':'\/pro'\}/);
 assert.match(pro,/AeroMind <em>Pro<\/em>/);
 assert.match(pro,/AMPLIADO 5/);
 assert.match(pro,/EXPANDIDO 7/);
 assert.match(gold,/Rosa 10x · 2 Rodadas/);
 assert.match(gold,/Rosa 10x · 8 Rodadas/);
 assert.match(gold,/GOLD EM PREPARAÇÃO/);
 assert.match(gold,/SEM VENDA ATIVA/);
});

test('Pro só entra no checkout se o preço estiver publicado; Gold não permite compra',()=>{
 const pro=read('app/pro/page.tsx'),planos=read('app/planos/page.tsx');
 assert.match(pro,/const offers=plans\.filter\(p=>p\.tier==='Pro'/);
 assert.match(pro,/plan\?<Link href=\{'\/checkout\?plano='/);
 assert.match(pro,/Preço ainda não publicado/);
 assert.match(planos,/if\(card\.tier==='Pro'&&!plan\)return proCampaign\?<Link/);
 assert.match(planos,/if\(card\.tier==='Ultra'\)return goldCampaign\?<Link/);
 const goldBranch=planos.split("if(card.tier==='Ultra')return goldCampaign?<Link")[1].split('const plan=planData.find')[0];
 assert.ok(goldBranch&&!goldBranch.includes('/checkout'));
 assert.ok(!read('app/gold/page.tsx').includes('/checkout'));
 assert.match(planos,/tier:'Ultra'/); // legado continua no catálogo
});

test('Gestão de campanhas separada do catálogo e somente administradores',()=>{
 const admin=read('app/admin/divulgacao/page.tsx'),action=read('app/admin/divulgacao/actions.ts');
 assert.match(admin,/requireAdmin\(\)/);
 assert.match(admin,/\['admin','owner'\]/);
 assert.match(admin,/aeromind_admin_all_plans/);
 assert.match(admin,/aeromind_gold_admin_overview/);
 assert.match(admin,/aeromind_tier_campaign_audit/);
 assert.match(admin,/sb\.rpc\('aeromind_admin_campaigns'\)/);
 assert.match(admin,/PlanReadiness/);
 assert.match(action,/aeromind_admin_save_tier_campaign/);
 assert.match(action,/reason\.length>=8/);
 assert.match(action,/revalidatePath\('\/planos'\)/);
 assert.doesNotMatch(action,/update.*licenses|checkout_enabled.*true/);
});

test('Campanha pública só lê o que está visível e não altera preço nem permissões',()=>{
 const api=read('lib/campaigns.ts');
 assert.match(api,/\.eq\('visible',true\)/);
 assert.match(api,/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
 assert.doesNotMatch(api,/service_role|UPDATE|INSERT|DELETE/);
 assert.match(sql,/enable row level security/g);
 assert.match(sql,/grant select on public\.aeromind_tier_campaigns to anon,authenticated/);
 assert.match(sql,/using \(visible=true\)/);
 const publicPolicy=read('supabase/migrations/20261025132000_campaign_public_read_and_admin_rpc.sql');
 assert.match(publicPolicy,/aeromind_admin_campaigns/);
 assert.match(publicPolicy,/from public\.aeromind_tier_campaigns c/);
 assert.match(publicPolicy,/auth\.uid\(\)/);
 assert.match(sql,/aeromind_staff/);
 assert.doesNotMatch(sql,/grant (?:insert|update|delete|all) on public\.aeromind_tier_campaigns to (?:anon|authenticated)/i);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(fix,/update public\.aeromind_tier_campaigns as c/);
 assert.match(fix,/returning to_jsonb\(c\)/);
 assert.doesNotMatch(sql,/\b(?:update|delete from|truncate)\s+public\.(?:licenses|aeromind_payment_orders|aeromind_gold_access)\b/i);
});

test('Formulários e apresentações continuam responsivos para celular',()=>{
 const css=read('app/admin/divulgacao/marketing.css');
 const pro=read('app/pro/pro.css'),landing=read('app/landing-neon.css'),gold=read('app/gold/gold.css');
 assert.match(css,/@media\(max-width:460px\)/);
 assert.match(pro,/@media\(max-width:620px\)/);
 assert.match(landing,/\.nl-campaign-grid/);
 assert.match(gold,/\.ag-mode-grid/);
});
