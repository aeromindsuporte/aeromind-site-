import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeWhatsAppBR,displayWhatsApp} from '../lib/whatsapp.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('normaliza WhatsApp em formatos com e sem DDI',()=>{
 assert.equal(normalizeWhatsAppBR('(11) 99999-9999'),'+5511999999999');
 assert.equal(normalizeWhatsAppBR('+55 (11) 99999-9999'),'+5511999999999');
 assert.equal(normalizeWhatsAppBR('11999999999'),'+5511999999999');
 assert.equal(displayWhatsApp('+5511999999999'),'+55 (11) 99999-9999');
});
test('rejeita contatos incompletos e números de fora do padrão',()=>{
 for(const phone of ['123','00000000000','+1 202 555 0123','abc','(00) 00000-0000']){
  assert.equal(normalizeWhatsAppBR(phone),null,phone);
 }
 assert.equal(normalizeWhatsAppBR(''),null);
});
test('cadastro coleta número e mantém opt-in de marketing opcional',()=>{
 const signup=read('components/auth/AccessForm.tsx');
 assert.ok(signup.includes('whatsapp_e164:number'));
 assert.ok(signup.includes('whatsapp_marketing_opt_in:marketingConsent'));
 assert.ok(signup.includes('WhatsApp com DDD'));
 assert.ok(signup.includes('opcional'));
});
test('conta permite edição retroativa do WhatsApp',()=>{
 assert.ok(read('app/minha-conta/page.tsx').includes('<AccountWhatsApp'));
 assert.ok(read('components/account/AccountWhatsApp.tsx').includes("eq('id',user.id)"));
});
test('gerenciador V3 exige autenticação administrativa e apresenta todas as abas',()=>{
 const page=read('app/admin/cliente/[id]/page.tsx');
 assert.ok(page.includes('requireAdmin()'));
 assert.ok(page.includes("aeromind_admin_customer_v3"));
 for(const name of ['Resumo','Licenças e renovação','Pagamentos','Dispositivos','Histórico e notas','Suporte'])
  assert.ok(page.includes("label:'"+name+"'"),name);
 for(const action of ['saveCustomerContact','addCustomerNote','renewCustomerLicense'])
  assert.ok(page.includes(action),action);
});
test('renovações exigem confirmação e não ativam Pix',()=>{
 const actions=read('app/admin/customer-actions.ts');
 assert.match(actions,/confirmation.*===.yes./);
 assert.ok(actions.includes("aeromind_admin_renew_customer_v3"));
 assert.ok(!actions.includes('PAGGPAY_API_KEY'));
});
test('UI responsiva em celular e abas com seleção acessível',()=>{
 const css=read('app/admin/cliente/[id]/customer-v3.css');
 assert.ok(css.includes('@media(max-width:560px)'));
 assert.ok(css.includes('overflow-x:auto'));
 const component=read('components/admin/CustomerTabs.tsx');
 assert.ok(component.includes('role="tablist"'));
 assert.ok(component.includes('aria-selected'));
});


test('WhatsApp tem permissão de gravação por coluna, RLS e confirmação real de update',()=>{
 const sql=read('supabase/migrations/20261023212000_profile_whatsapp_update_grants.sql');
 const editor=read('components/account/AccountWhatsApp.tsx');
 assert.match(sql,/grant update\s*\([\s\S]*whatsapp_e164[\s\S]*whatsapp_marketing_opt_in[\s\S]*whatsapp_opt_in_at[\s\S]*updated_at[\s\S]*\) on table public\.profiles to authenticated/);
 assert.ok(!/grant update on table public\.profiles to authenticated/.test(sql));
 assert.match(editor,/\.eq\('id',user\.id\)\.select\('id'\)\.maybeSingle\(\)/);
 assert.match(editor,/if\(!data\)/);
 assert.match(editor,/Sua sessão expirou/);
 assert.match(editor,/23514/);
 assert.match(editor,/42501/);
});
