import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Pulse autentica presença e estado online expira sem heartbeat',()=>{
 const sql=source('supabase/migrations/20261025160000_aurora_pulse_presence_app_notices.sql');
 assert.match(sql,/aeromind_app_presence enable row level security/);
 assert.match(sql,/aeromind_pulse_presence/);
 assert.match(sql,/p_event not in \('foreground','heartbeat','background','logout'\)/);
 assert.match(sql,/last_seen_at>clock_timestamp\(\)-interval '110 seconds'/);
 assert.match(sql,/user_id=who/);
 assert.match(sql,/session_id=p_session_id/);
 assert.doesNotMatch(sql,/\b(?:ip_address|geolocation|password|balance|cookie)\b/i);
});
test('Apenas ADM consulta presença consolidada, sem aceitar ID arbitrário',()=>{
 const sql=source('supabase/migrations/20261025160000_aurora_pulse_presence_app_notices.sql');
 const page=source('app/admin/presenca/page.tsx');
 assert.match(sql,/aeromind_admin_pulse_presence/);
 assert.match(sql,/private\.aeromind_verified_staff\(\)/);
 assert.match(sql,/revoke all on function public\.aeromind_admin_pulse_presence\(\) from public,anon,authenticated/);
 assert.match(page,/requireAdmin\(\)/);
 assert.match(page,/\['admin','owner'\]/);
 assert.match(page,/!data\?\.ok/);
 assert.match(page,/s\.online/);
 assert.match(page,/s\.last_seen_at/);
 assert.match(source('components/admin/CommercialAdminShell.tsx'),/admin\/presenca/);
});
test('Notificações ADM app respeitam destinatário e canal app',()=>{
 const sql=source('supabase/migrations/20261025160000_aurora_pulse_presence_app_notices.sql');
 const read=source('supabase/migrations/20261025170000_aurora_pulse_mark_app_notices_read.sql');
 const actions=source('app/admin/notificacoes/actions.ts');
 const ui=source('app/admin/notificacoes/NotificationCenter.tsx');
 assert.match(sql,/d\.user_id=who and c\.channel_app=true/);
 assert.match(read,/d\.user_id=who and d\.read_at is null/);
 assert.match(actions,/channel_app:input\.channel_app===true/);
 assert.match(actions,/!input\.channel_site\|\|input\.channel_push/);
 assert.match(ui,/checked=\{form\.channel_app\}/);
});
