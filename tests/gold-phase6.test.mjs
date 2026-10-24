import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {evaluateGoldAlertPreview} from '../lib/gold/alert-preview.ts';
import {normalizeAuthorizedRound,verifyAuthorizedSourceSignature,authorizedSourceCanIngest} from '../lib/gold/source-contract.ts';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const src=read('supabase/migrations/20261024230000_gold_phase6_source_gate_alert_preview.sql');
const subject='11111111-1111-4111-8111-111111111111';
const s=(id,at,target=2,profile='Gold',indicator='BAIXA')=>({
 id,subject_id:subject,stream_key:'laboratorio_01',next_round_key:'r'+id,
 anchor_round_id:1,profile,indicator,target_x:target,rule_version:'manual-declared-v1',
 evidence_type:'manual_declared',emitted_at:at
});
const rule=(enabled=true,cooldown=5)=>({
 id:2,subject_id:subject,profile:'Gold',indicator:'BAIXA',
 preview_enabled:enabled,min_target_x:2,cooldown_minutes:cooldown,
 delivery_enabled:false,updated_at:'2026-10-24T13:00:00Z'
});
const round=(id,key,value,at)=>({
 id,subject_id:subject,stream_key:'laboratorio_01',round_key:key,
 multiplier:value,source_kind:'manual_admin',observed_at:at
});
test('6.1: evento autorizado tem contrato estrito e origem explícita',()=>{
 const payload={provider:'approved_provider',eventId:'event_1',sessionId:'session_1',
  stream:'stream_01',roundId:'r001',occurredAt:'2026-10-24T13:00:00-03:00',multiplier:2.5,version:'v1'};
 assert.deepEqual(normalizeAuthorizedRound(payload,'approved_provider'),payload);
 assert.throws(()=>normalizeAuthorizedRound(payload,'wrong_provider'));
 assert.throws(()=>normalizeAuthorizedRound({...payload,additional:'hidden'},'approved_provider'));
 assert.throws(()=>normalizeAuthorizedRound({...payload,multiplier:Infinity},'approved_provider'));
 assert.throws(()=>normalizeAuthorizedRound({...payload,eventId:''},'approved_provider'));
});
test('6.2: HMAC exige segredo forte, timestamp recente e corpo exato',()=>{
 const raw='{"provider":"approved_provider","eventId":"x"}',secret='s'.repeat(40),now=1792862400000;
 const timestamp=String(now-12000);
 const signature='sha256='+createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex');
 assert.equal(verifyAuthorizedSourceSignature(raw,secret,timestamp,signature,now),true);
 assert.equal(verifyAuthorizedSourceSignature(raw+' ',secret,timestamp,signature,now),false);
 assert.equal(verifyAuthorizedSourceSignature(raw,secret,timestamp,signature,now+121000),false);
 assert.equal(verifyAuthorizedSourceSignature(raw,secret.slice(0,15),timestamp,signature,now),false);
 assert.equal(verifyAuthorizedSourceSignature(raw,secret,timestamp,'sha256='+'f'.repeat(64),now),false);
});
test('6.3: somente fonte verificada pode ser considerada apta, não há ativação padrão',()=>{
 assert.equal(authorizedSourceCanIngest({ingestionEnabled:false,deliveryEnabled:false,state:'not_configured',provider:null,verifiedAt:null}),false);
 assert.equal(authorizedSourceCanIngest({ingestionEnabled:false,deliveryEnabled:false,state:'verified',provider:'foo',verifiedAt:'2026-10-24T13:00:00Z'}),false);
 assert.equal(authorizedSourceCanIngest({ingestionEnabled:true,deliveryEnabled:false,state:'verified',provider:'foo',verifiedAt:'2026-10-24T13:00:00Z'}),true);
});
test('6.4: regras de prévia incluem expiração e intervalo entre candidatos',()=>{
 const signals=[
 s(1,'2026-10-24T13:00:00Z'),s(2,'2026-10-24T13:01:00Z'),
 s(3,'2026-10-24T13:01:10Z'),s(4,'2026-10-24T13:01:30Z',1.8),
 s(5,'2026-10-24T13:01:45Z',3,'Clássico')
 ];
 const res=evaluateGoldAlertPreview([rule()],signals,[],'2026-10-24T13:02:00Z',100);
 const state=new Map(res.decisions.map(x=>[x.signalId,x.state]));
 assert.equal(state.get(1),'expired');
 assert.equal(state.get(2),'lab_candidate');
 assert.equal(state.get(3),'cooldown');
 assert.equal(state.get(4),'below_minimum');
 assert.equal(state.get(5),'no_rule');
 assert.equal(res.candidateCount,1);assert.equal(res.deliveryEnabled,false);
});
test('6.5: regra desligada, sinal resolvido ou relógio futuro não produz candidato',()=>{
 const x=evaluateGoldAlertPreview([rule(false)],
  [s(1,'2026-10-24T13:01:00Z')],[],'2026-10-24T13:01:15Z');
 assert.equal(x.candidateCount,0);
 assert.equal(x.decisions[0].state,'preview_disabled');
 const result=evaluateGoldAlertPreview([rule(true)],
  [s(1,'2026-10-24T13:01:00Z'),s(2,'2026-10-24T13:05:00Z')],
  [round(1,'r1',2.5,'2026-10-24T13:02:00Z')],'2026-10-24T13:02:30Z');
 assert.equal(result.decisions.find(x=>x.signalId===1)?.state,'resolved');
 assert.equal(result.decisions.find(x=>x.signalId===2)?.state,'invalid_clock');
});
test('6.6: separação entre clientes, fluxos e versões, sem envio de notificações',()=>{
 const other=s(100,'2026-10-24T13:01:00Z');
 const r=evaluateGoldAlertPreview([rule()],[{...other,subject_id:'22222222-2222-4222-8222-222222222222'}],[],
  '2026-10-24T13:01:30Z');
 assert.equal(r.candidateCount,0);assert.equal(r.decisions[0].state,'no_rule');
 const component=read('app/admin/gold/alertas/page.tsx');
 assert.match(component,/requireAdmin\(\)/);
 assert.match(component,/role\)\)redirect\('\/admin'\)/);
 assert.match(component,/\.eq\('subject_id',client\)/);
 assert.match(component,/provedor externo/);
 assert.doesNotMatch(component,/\/api\/pix\/create|sendWhatsApp|pushNotification/);
});
test('6.7: SQL mantém coleta e entrega desativadas mesmo com mutação não autorizada',()=>{
 assert.match(src,/ingestion_enabled boolean not null default false check\(ingestion_enabled=false\)/);
 assert.match(src,/external_delivery_enabled boolean not null default false check\(external_delivery_enabled=false\)/);
 assert.match(src,/delivery_enabled boolean not null default false check\(delivery_enabled=false\)/);
 assert.match(src,/create table if not exists public\.aeromind_gold_alert_preview_rules/);
 assert.match(src,/create table if not exists public\.aeromind_gold_alert_rule_audit/);
 assert.match(src,/enable row level security/g);
 assert.match(src,/revoke all on public\.aeromind_gold_alert_preview_rules from public,anon,authenticated/);
 assert.match(src,/on conflict\(subject_id,profile,indicator\)/);
 assert.match(src,/p_reason/);
 assert.match(src,/auth\.uid\(\)/);
 assert.doesNotMatch(src,/\b(?:update|delete from|truncate)\s+(?:public\.)?(?:licenses|aeromind_payment_orders|aeromind_plan_catalog)\b/i);
});
test('6.8: nenhuma rota de ingestão real é declarada no app antes da homologação',()=>{
 const action=read('app/admin/gold/alertas/actions.ts');
 const source=read('lib/gold/source-contract.ts');
 assert.match(action,/aeromind_gold_admin_save_alert_preview_rule/);
 assert.match(action,/reason\.length<8/);
 assert.match(source,/SEM endpoint ativo/);
 assert.match(source,/timingSafeEqual/);
 assert.doesNotMatch(source,/service_role|supabaseService|fetch\(/);
 const css=read('app/admin/gold/alertas/alerts.css');
 assert.match(css,/@media\(max-width:460px\)/);
});
