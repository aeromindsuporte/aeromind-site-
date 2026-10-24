import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('tela gratuita Premium segue o design aprovado sem alterar cadastro',()=>{
 const page=read('app/teste-gratis/page.tsx');
 for(const t of ['Experimente o','TESTE GRATUITO','Sem Pix e sem cobrança','Premium',
  'DISPONIBILIDADE','trial-price-zero','trial-feature-grid','Garantir teste grátis agora','LIBERAÇÃO ATIVA',
  'Após a ativação','Nenhum Pix é gerado']){
   const source=t==='DISPONIBILIDADE'?read('components/trial/TrialAvailability.tsx'):page;
   assert.ok(source.includes(t),'Ausente: '+t);
 }
 assert.match(page,/import '\.\/trial-premium\.css'/);
 assert.match(page,/TrialAvailability/);
 assert.match(page,/action=\{activateFreeTrial\}/);
 assert.match(page,/href=\{'\/entrar\?next='/);
 assert.match(page,/hasLicense\?/);
 assert.match(page,/exhausted\?/);
 assert.match(page,/plan\.tier==='Pro'/);
 assert.match(page,/plano==='teste-horas'/);
});

test('número de vagas vem de RPC real, sem redução fictícia',()=>{
 const page=read('app/teste-gratis/page.tsx');
 const tracker=read('components/trial/TrialAvailability.tsx');
 const sql=read('supabase/migrations/20261024110000_premium_trial_real_slots.sql');
 assert.match(page,/aeromind_public_free_trial_slots/);
 assert.match(tracker,/\.rpc\('aeromind_public_free_trial_slots'/);
 assert.match(tracker,/initialRemaining/);
 assert.match(tracker,/data<0/);
 assert.ok(!/Math\.random\(|Math\.floor\(Math\.random\(/.test(page+tracker));
 assert.ok(!/setInterval\([^)]*remaining\s*-\s*1/.test(tracker));
 assert.match(sql,/remaining=remaining-1/);
 assert.match(sql,/remaining>0/);
 assert.match(sql,/insert into public\.aeromind_free_trial_claims/);
 assert.match(sql,/on conflict \(plan_slug\) do nothing/);
 assert.match(sql,/values \('teste-horas',12,12,true\)/);
});

test('banco libera Pro/Premium pelo período do teste e bloqueia quem já utilizou',()=>{
 const sql=read('supabase/migrations/20261024110000_premium_trial_real_slots.sql');
 assert.match(sql,/set tier='Pro'/);
 assert.match(sql,/marketing_description='Experimente os recursos Premium/);
 assert.match(sql,/Monitoramento Premium/);
 assert.match(sql,/if exists\(select 1 from public\.aeromind_free_trial_claims where user_id=v_user\)/);
 assert.match(sql,/if exists\(select 1 from public\.licenses where user_id=v_user\)/);
 assert.match(sql,/if v_batch_slug is null then/);
 assert.match(sql,/auth\.users u where u\.id=v_user and u\.email_confirmed_at is not null/);
 assert.match(sql,/insert into public\.licenses\(user_id,plan_name,status,valid_until\)/);
 assert.match(sql,/values\(v_user,v_plan\.tier,'active',v_until\)/);
 assert.match(sql,/alter table public\.aeromind_free_trial_batches enable row level security/);
 assert.match(sql,/revoke all on table public\.aeromind_free_trial_batches from public, anon, authenticated/);
 assert.match(sql,/grant execute on function public\.aeromind_public_free_trial_slots\(text\) to anon, authenticated/);
 const action=read('app/teste-gratis/actions.ts');
 assert.match(action,/msg\.includes\('esgotadas'\)\?'vagas'/);
 assert.match(action,/rpc\('aeromind_claim_free_trial'/);
});

test('movimentos têm opção sem animação e layout próprio responsivo',()=>{
 const css=read('app/teste-gratis/trial-premium.css');
 for(const key of ['trial-cta-breathe','trial-clock-breathe','trial-orbit','trial-plane-drift',
 'trial-live-flash','trial-arrow-shift','trial-count-enter','prefers-reduced-motion',
 '@media(max-width:480px)','@media(max-width:350px)'])assert.ok(css.includes(key),key);
 assert.match(css,/\.trial-page\{/);
 assert.match(css,/\.trial-premium-card\{/);
 assert.match(css,/\.trial-scarcity-main\{/);
 assert.match(css,/\.trial-action-button\{/);
 assert.match(css,/\.trial-feature-grid\{/);
 assert.ok(!css.includes('.nl-hero{'),'não alterar estilos da landing');
});
