import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261103174500_admin_live_activity.sql');

test('recording signup and activation at the database source, without modifying auth or trial RPC',()=>{
 assert.match(sql,/AFTER INSERT ON auth\.users/);
 assert.match(sql,/AFTER INSERT ON public\.aeromind_free_trial_claims/);
 assert.match(sql,/event_type.*signup/);
 assert.match(sql,/event_type.*trial_activated/);
 assert.match(sql,/ON CONFLICT DO NOTHING/);
 assert.doesNotMatch(sql,/CREATE OR REPLACE FUNCTION public\.aeromind_claim_free_trial/i);
});
test('admin activity contains staff-only RLS, personal read cursors and private write triggers',()=>{
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/g);
 assert.match(sql,/CREATE POLICY aeromind_activity_staff_read/);
 assert.match(sql,/private\.aeromind_verified_staff\(\)/);
 assert.match(sql,/admin_id=\(SELECT auth\.uid\(\)\)/);
 assert.match(sql,/REVOKE ALL ON public\.aeromind_admin_activity_events FROM PUBLIC,anon,authenticated/);
 assert.doesNotMatch(sql,/GRANT (?:INSERT|UPDATE|DELETE|ALL) ON public\.aeromind_admin_activity_events TO (?:anon|authenticated)/i);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.aeromind_admin_activity_mark_seen\(\) FROM PUBLIC,anon,authenticated/);
});
test('trial interest uses tracked server redirect and prevents prefetch false positives',()=>{
 const home=read('app/page.tsx');
 const plans=read('app/planos/page.tsx');
 const route=read('app/ir-para-teste/route.ts');
 assert.match(home,/href="\/ir-para-teste\?plano=teste-horas" prefetch=\{false\}/);
 assert.match(plans,/\/ir-para-teste\?plano=/);
 assert.match(route,/aeromind_record_trial_click/);
 assert.match(route,/httpOnly:true/);
 assert.match(route,/Cache-Control','private, no-store/);
 assert.match(sql,/interval '20 minutes'/);
 assert.match(sql,/p_slug NOT IN \('teste-horas','teste-dias'\)/);
 assert.doesNotMatch(route,/service_role|secret|sessionStorage/);
});
test('bell and activity feed appear in both staff headers and use realtime with polling recovery',()=>{
 const common=read('components/admin/CommercialAdminShell.tsx');
 const dashboard=read('app/admin/page.tsx');
 const bell=read('components/admin/AdminActivityBell.tsx');
 const feed=read('components/admin/AdminActivityFeed.tsx');
 const hook=read('components/admin/useAdminActivity.ts');
 const page=read('app/admin/atividade/page.tsx');
 for(const x of [common,dashboard])assert.match(x,/AdminActivityBell/);
 assert.match(common,/\/admin\/atividade/);
 assert.match(dashboard,/\/admin\/atividade/);
 assert.match(page,/requireAdmin\(\)/);
 assert.match(feed,/markSeen/);
 assert.match(bell,/aria-live="polite"/);
 assert.match(hook,/postgres_changes/);
 assert.match(hook,/window\.setInterval/);
 assert.match(sql,/ALTER PUBLICATION supabase_realtime ADD TABLE public\.aeromind_admin_activity_events/);
});
