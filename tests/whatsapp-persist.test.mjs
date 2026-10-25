import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeWhatsAppBR,displayWhatsApp} from '../lib/whatsapp.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('WhatsApp brasileiro válido mantém o padrão internacional E.164',()=>{
 assert.equal(normalizeWhatsAppBR('(11) 99999-9999'),'+5511999999999');
 assert.equal(normalizeWhatsAppBR('+55 (11) 99999-9999'),'+5511999999999');
 assert.equal(normalizeWhatsAppBR('11999999999'),'+5511999999999');
 assert.equal(displayWhatsApp('+5511999999999'),'+55 (11) 99999-9999');
 assert.equal(normalizeWhatsAppBR(''),null);
 assert.equal(normalizeWhatsAppBR('+44 20 7946 0958'),null);
});
test('Conta lê sempre o número do Supabase e reporta erro de consulta',()=>{
 const page=read('app/minha-conta/page.tsx');
 assert.match(page,/client\.from\('profiles'\)\.select\('display_name,whatsapp_e164,whatsapp_marketing_opt_in'\)/);
 assert.match(page,/initial=\{profileResult\.data\?\.whatsapp_e164\|\|null\}/);
 assert.match(page,/loadError=\{Boolean\(profileResult\.error\)\}/);
});
test('Cadastro de WhatsApp só abre automaticamente se nunca houve número salvo',()=>{
 const comp=read('components/account/AccountWhatsApp.tsx');
 assert.match(comp,/useState\(!initial\)/);
 assert.match(comp,/if\(savedNumber&&!editing\)/);
 assert.match(comp,/WhatsApp cadastrado/);
 assert.match(comp,/Alterar WhatsApp/);
 assert.match(comp,/setSavedNumber\(verified\.whatsapp_e164\)/);
 assert.match(comp,/setEditing\(!verified\.whatsapp_e164\)/);
 assert.doesNotMatch(comp,/localStorage|sessionStorage|setUserMetadata/);
});
test('Gravação é limitada ao perfil autenticado e só confirma após leitura posterior',()=>{
 const comp=read('components/account/AccountWhatsApp.tsx');
 assert.match(comp,/sb\.auth\.getUser\(\)/);
 assert.match(comp,/\.update\(\{/);
 assert.match(comp,/\.eq\('id',user\.id\)\.select\('whatsapp_e164,whatsapp_marketing_opt_in'\)\.maybeSingle\(\)/);
 assert.match(comp,/if\(!data\|\|data\.whatsapp_e164!==formatted\)/);
 assert.match(comp,/const \{data:verified,error:readError\}=await sb\.from\('profiles'\)/);
 assert.match(comp,/if\(readError\|\|!verified\|\|verified\.whatsapp_e164!==formatted\)/);
 assert.ok(comp.indexOf('if(readError||!verified')<comp.indexOf('setMsg(verified.whatsapp_e164?'));
});
test('Layout de resumo cadastrado mantém suporte para celulares',()=>{
 const css=read('app/auth.css');
 assert.match(css,/\.account-whatsapp-saved\{/);
 assert.match(css,/\.account-whatsapp-view\{/);
 assert.match(css,/@media\(max-width:470px\)/);
});

test('Botão WhatsApp não expande verticalmente no flex column de celulares',()=>{
 const css=read('app/auth.css');
 assert.match(css,/\.account-whatsapp-buttons\{display:flex;/);
 assert.match(css,/@media\(max-width:470px\)\{[\s\S]*?\.account-whatsapp-buttons\{flex-direction:column;align-items:stretch\}/);
 assert.match(css,/\.account-whatsapp-buttons button\{flex:0 0 auto;width:100%;min-height:48px;height:auto;/);
 assert.match(css,/\.account-whatsapp-form \.account-whatsapp-buttons \.auth-submit\{max-width:100%;/);
 assert.doesNotMatch(css,/\.account-whatsapp-buttons button\{flex:1 1 175px;/);
});
