import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {goldProspectiveReport,goldProspectiveCsv} from '../lib/gold/prospective.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261024220000_gold_phase5_prospective_events.sql');
const subject='11111111-1111-4111-8111-111111111111';
const base={subject_id:subject,stream_key:'laboratorio_01',source_kind:'manual_admin'};
const signalsBase={subject_id:subject,stream_key:'laboratorio_01',anchor_round_id:11,
 rule_version:'manual-declared-v1',evidence_type:'manual_declared',
 indicator:'BAIXA',profile:'Gold',target_x:2.0};
const round=(id,key,multiplier,time)=>({...base,id,round_key:key,multiplier,observed_at:time});
const sig=(id,key,time,more={})=>({...signalsBase,id,next_round_key:key,emitted_at:time,...more});
test('fase5: rodada informada depois do sinal produz conferência de limiar, não aposta',()=>{
 const s=[sig(1,'r2','2026-10-24T13:00:10Z'),sig(2,'r3','2026-10-24T13:00:20Z')];
 const r=[round(12,'r2',2.5,'2026-10-24T13:00:50Z'),round(13,'r3',1.5,'2026-10-24T13:01:10Z')];
 const report=goldProspectiveReport(s,r);
 assert.equal(report.signalCount,2);assert.equal(report.sourceVerified,false);
 assert.deepEqual(report.signals.map(x=>x.state),['limiar_atingido','limiar_nao_atingido']);
 const summary=report.summaries.find(x=>x.profile==='Gold'&&x.indicator==='BAIXA');
 assert.equal(summary?.resolved,2);assert.equal(summary?.hitRate,0.5);
});
test('fase5: pendente não é contabilizado como acerto e resultado prematuro gera inconsistência',()=>{
 const a=sig(1,'r20','2026-10-24T13:01:00Z');
 const b=sig(2,'r21','2026-10-24T13:01:20Z');
 const report=goldProspectiveReport([a,b],[round(1,'r21',15,'2026-10-24T13:01:00Z')]);
 assert.deepEqual(report.signals.map(x=>x.state),['aguardando_resultado','ordem_inconsistente']);
 const stat=report.summaries.find(x=>x.profile==='Gold'&&x.indicator==='BAIXA');
 assert.equal(stat?.hitRate,null);assert.equal(stat?.pending,1);assert.equal(stat?.inconsistent,1);
});
test('fase5: mesmo ID de rodada em outro fluxo não cruza relatórios',()=>{
 const report=goldProspectiveReport([sig(1,'r2','2026-10-24T13:01:00Z')],[{...round(5,'r2',99,'2026-10-24T13:02:00Z'),stream_key:'outro_fluxo'}]);
 assert.equal(report.signals[0].state,'aguardando_resultado');
});
test('fase5: Clássico apenas referência e lacunas são de recebimento, não jogo',()=>{
 const report=goldProspectiveReport(
  [sig(1,'r2','2026-10-24T13:01:00Z',{profile:'Clássico'})],
  [round(11,'r1',2,'2026-10-24T13:00:00Z'),round(12,'r2',3,'2026-10-24T13:06:00Z')]);
 assert.equal(report.summaries.find(s=>s.profile==='Clássico'&&s.indicator==='BAIXA')?.hit,1);
 assert.equal(report.gapsOver300,1);
});
test('fase5: CSV mantém origem declarada e escape de fórmulas',()=>{
 const report=goldProspectiveReport([sig(1,'-formula','2026-10-24T13:01:00Z')],[]);
 const csv=goldProspectiveCsv(report);
 assert.match(csv,/manual_admin/);
 assert.match(csv,/"'-formula"/);
 assert.doesNotMatch(csv,/email|telefone|pix|lucro/ig);
});
test('fase5: esquema aditivo com RLS e sem writes diretos para usuários',()=>{
 for(const table of ['aeromind_gold_round_observations','aeromind_gold_prospective_signals','aeromind_gold_report_exports']){
  assert.match(sql,new RegExp('create table if not exists public\\.'+table));
  assert.match(sql,new RegExp('alter table public\\.'+table+' enable row level security'));
  assert.match(sql,new RegExp('revoke all on public\\.'+table+' from public,anon,authenticated'));
  assert.match(sql,new RegExp('grant select on public\\.'+table+' to authenticated'));
  assert.doesNotMatch(sql,new RegExp('grant (?:insert|update|delete|all) on public\\.'+table+' to authenticated'));
 }
 assert.doesNotMatch(sql,/\b(?:update|delete from|truncate)\s+(?:public\.)?(?:licenses|aeromind_payment_orders|aeromind_plan_catalog)\b/i);
 assert.match(sql,/check\(source_kind='manual_admin'\)/);
 assert.match(sql,/unique\(subject_id,stream_key,round_key\)/);
});
test('fase5: RPCs validam operador, ordem, duplicidade e acesso autenticado',()=>{
 for(const fn of ['aeromind_gold_admin_record_round','aeromind_gold_admin_record_signal','aeromind_gold_admin_log_export']){
  assert.match(sql,new RegExp('create or replace function public\\.'+fn));
  assert.match(sql,new RegExp('revoke all on function public\\.'+fn));
  assert.match(sql,new RegExp('grant execute on function public\\.'+fn));
 }
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/last_key is distinct from p_anchor_round_key/);
 assert.match(sql,/Resultado já registrado antes do sinal/);
 const actions=read('app/admin/gold/monitoramento/actions.ts');
 assert.match(actions,/requireAdmin\(\)/);
 assert.match(actions,/role!=='admin'&&role!=='owner'/);
 assert.match(actions,/aeromind_gold_admin_record_round/);
 assert.match(actions,/aeromind_gold_admin_record_signal/);
});
test('fase5: exportação sem cache e com auditoria antes de transmitir CSV',()=>{
 const api=read('app/api/admin/gold/export/route.ts');
 const page=read('app/admin/gold/monitoramento/page.tsx');
 assert.match(api,/sb\.auth\.getUser\(\)/);
 assert.match(api,/\['admin','owner'\]/);
 assert.match(api,/\.eq\('subject_id',client\)/);
 assert.match(api,/aeromind_gold_admin_log_export/);
 assert.ok(api.indexOf('aeromind_gold_admin_log_export')<api.indexOf('return new Response(goldProspectiveCsv'));
 assert.match(api,/no-store/);
 assert.match(page,/Monitoramento prospectivo/);
 assert.match(page,/NÃO comprovam/);
 assert.match(page,/recordGoldRound/);
 assert.match(page,/recordGoldSignal/);
 assert.match(page,/goldProspectiveReport/);
 const css=read('app/admin/gold/monitoramento/monitor.css');
 assert.match(css,/@media\(max-width:460px\)/);
});
