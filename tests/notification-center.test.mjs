import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('migração define RLS de campanhas e isolamento de entregas por cliente',()=>{
 const sql=source('supabase/migrations/20261023195500_notification_center.sql');
 assert.match(sql,/aeromind_notification_campaigns enable row level security/);
 assert.match(sql,/aeromind_notification_deliveries enable row level security/);
 assert.match(sql,/aeromind_notification_delivery_self/);
 assert.match(sql,/user_id=\(select auth.uid\(\)\)/);
 assert.match(sql,/private\.aeromind_verified_staff\(\)/);
 assert.match(sql,/unique\(campaign_id,user_id\)/);
 assert.match(sql,/aeromind_notification_audience_check/);
});
test('envio exige funcionário confirmado, distingue públicos e não duplica entregas',()=>{
 const sql=source('supabase/migrations/20261023195500_notification_center.sql');
 assert.match(sql,/aeromind_admin_send_campaign/);
 assert.match(sql,/if not private\.aeromind_verified_staff\(\)/);
 assert.match(sql,/p_campaign_id uuid/);
 assert.match(sql,/on conflict\(campaign_id,user_id\) do nothing/);
 assert.match(sql,/c\.audience_type='user'/);
 assert.match(sql,/c\.audience_type in \('active','tier'\)/);
 assert.match(sql,/l\.valid_until>now\(\)/);
 assert.match(sql,/c\.status not in \('draft','template','scheduled'\)/);
});
test('agendamento utiliza cron nativo do banco e validade relativa ao envio',()=>{
 const sql=source('supabase/migrations/20261023195500_notification_center.sql');
 assert.match(sql,/create extension if not exists pg_cron/);
 assert.match(sql,/cron\.schedule\('aeromind_notifications_due_v1'/);
 assert.match(sql,/aeromind_process_scheduled_campaigns/);
 assert.match(sql,/status='scheduled' and scheduled_at<=now\(\)/);
 assert.match(sql,/make_interval\(mins => c\.validity_minutes\)/);
});
test('edição salva rascunho, agenda e app inbox opcional; push remoto segue desligado',()=>{
 const actions=source('app/admin/notificacoes/actions.ts');
 const ui=source('app/admin/notificacoes/NotificationCenter.tsx');
 assert.match(actions,/requireAdmin/);
 assert.match(actions,/\.in\('status',\['draft','scheduled','template'\]\)/);
 assert.match(actions,/!input\.channel_site\|\|input\.channel_push/);
 assert.match(actions,/channel_app:input\.channel_app===true/);
 assert.match(ui,/checked=\{form\.channel_app\}/);
 assert.match(ui,/persist\('template'\)/);
 assert.match(ui,/persist\('scheduled'\)/);
 assert.match(ui,/persist\('draft',true\)/);
 assert.match(ui,/disabled\/>/);
 assert.match(ui,/duplicateRow/);
});
test('cliente vê próprias mensagens e pode marcar como lidas',()=>{
 const inbox=source('app/notificacoes/page.tsx');
 const read=source('app/notificacoes/actions.ts');
 assert.match(inbox,/\.eq\('user_id',user\.id\)/);
 assert.match(inbox,/expires_at/);
 assert.match(inbox,/Expirada/);
 assert.match(read,/aeromind_mark_notification_read/);
 assert.match(read,/sb\.auth\.getUser\(\)/);
});
test('central aparece no painel e acesso do cliente',()=>{
 const shell=source('components/admin/CommercialAdminShell.tsx');
 const home=source('app/admin/page.tsx');
 const account=source('app/minha-conta/page.tsx');
 assert.match(shell,/admin\/notificacoes/);
 assert.match(home,/Abrir Central de Notificações/);
 assert.match(account,/Abrir minhas notificações/);
});
