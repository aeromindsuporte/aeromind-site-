import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=(name)=>new URL('../'+name,import.meta.url);
const source=name=>readFileSync(root(name),'utf8');
const pages=['page','clientes/page','licencas/page','planos/page','dispositivos/page',
 'releases/page','downloads/page','cupons/page','pagamentos/page','relatorios/page','suporte/page',
 'cliente/[id]/page','pix-diagnostico/page'];
test('todas as abas administrativas possuem páginas concretas',()=>{
 for(const page of pages)assert.ok(existsSync(root('app/admin/'+page+'.tsx')),'Rota ausente: '+page);
});
test('todas as áreas comerciais estão no menu de navegação',()=>{
 const menu=source('components/admin/CommercialAdminShell.tsx');
 for(const area of ['clientes','licencas','planos','dispositivos','releases',
 'downloads','cupons','pagamentos','relatorios','suporte'])
 assert.ok(menu.includes("'/admin/"+area+"'"),'Aba faltando: '+area);
});
test('operações de edição seguem protegidas e usam dados do Supabase',()=>{
 const assertions=[
 ['app/admin/clientes/page.tsx','aeromind_admin_search_customers'],
 ['app/admin/cliente/[id]/page.tsx','aeromind_admin_customer'],
 ['app/admin/licencas/page.tsx','aeromind_admin_overview'],
 ['app/admin/dispositivos/page.tsx','aeromind_admin_devices'],
 ['app/admin/releases/page.tsx','aeromind_admin_devices'],
 ['app/admin/planos/page.tsx','aeromind_admin_all_plans'],
 ['app/admin/cupons/page.tsx','saveCoupon'],
 ['app/admin/pagamentos/page.tsx','aeromind_admin_orders'],
 ['app/admin/relatorios/page.tsx','aeromind_admin_commercial_snapshot'],
 ['app/admin/downloads/page.tsx','aeromind_admin_downloads'],
 ['app/admin/suporte/page.tsx','SupportAdminChat'],
 ];
 for(const [file,term] of assertions)assert.ok(source(file).includes(term),file+' sem integração '+term);
 const chat=source('components/support/SupportAdminChat.tsx');
 assert.match(chat,/aeromind_support_chat_set_status/);
 assert.match(chat,/aeromind_support_chat_send/);
});
test('telas de clientes e edição evitam deslocamento UTC da validade',()=>{
 assert.ok(source('app/admin/cliente/[id]/page.tsx').includes('dateInputBrazil(current?.valid_until)'));
 assert.ok(source('app/admin/licencas/page.tsx').includes('formatLicenseExpiryBrazil'));
});
test('painel financeiro não apresenta teste obsoleto abaixo do Pix mínimo',()=>{
 const p=source('app/admin/pagamentos/page.tsx');
 assert.ok(!p.includes('Preparação do teste real — teto R$ 1,00'));
 assert.ok(p.includes('Receita confirmada'));
});
test('layout responsivo mantém navegação e tabelas sem recorte',()=>{
 const css=source('app/admin/admin.css');
 assert.match(css,/@media\(max-width:1050px\)/);
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/\.admin-commercial \.admin-table-scroll[\s\S]{0,100}overflow-x:auto/);
 assert.match(css,/\.admin-commercial \.admin-edit-grid\{grid-template-columns:1fr/);
});
