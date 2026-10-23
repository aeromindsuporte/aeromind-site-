import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('database migration enforces protected device activities',()=>{
 const migration=read('supabase/migrations/20261023180000_device_activity_center.sql');
 assert.match(migration,/enable row level security/i);
 assert.match(migration,/aeromind_device_activity_staff_read/);
 assert.match(migration,/private\.aeromind_verified_staff\(\)/);
 assert.match(migration,/after insert on public\.aeromind_device_audit/i);
 assert.match(migration,/after insert on public\.aeromind_support_tickets/i);
 assert.match(migration,/reviewed_at/);
 assert.match(migration,/on conflict \(source_kind,source_ref\) do nothing/);
});
test('administrative feed validates confirmed staff',()=>{
 const query=read('supabase/migrations/20261023180500_device_activity_admin_feed.sql');
 assert.match(query,/private\.aeromind_verified_staff\(\)/);
 assert.match(query,/auth\.users/);
 assert.match(query,/aeromind_support_tickets/);
});
test('device central has customer links and triage',()=>{
 const page=read('app/admin/movimentacoes/page.tsx');
 const action=read('app/admin/movimentacoes/actions.ts');
 assert.match(page,/aeromind_admin_device_activity/);
 assert.match(page,/admin\/cliente/);
 assert.match(page,/admin\/suporte\?ticket/);
 assert.match(page,/Marcar verificado/);
 assert.match(action,/requireAdmin/);
 assert.match(action,/aeromind_mark_device_event_seen/);
});
test('customer card and support include device histories and requests',()=>{
 const customer=read('app/admin/cliente/[id]/page.tsx');
 const support=read('app/suporte/actions.ts');
 const devices=read('app/dispositivos/page.tsx');
 assert.match(customer,/Histórico de movimentações dos aparelhos/);
 assert.match(customer,/aeromind_device_activity/);
 assert.match(support,/'dispositivo'/);
 assert.match(devices,/categoria=dispositivo/);
});
test('admin menu includes notification counter',()=>{
 const shell=read('components/admin/CommercialAdminShell.tsx');
 const homepage=read('app/admin/page.tsx');
 assert.match(shell,/Movimentações/);
 assert.match(shell,/DevicePendingCount/);
 assert.match(shell,/reviewed_at/);
 assert.match(homepage,/unreadDeviceAlerts/);
 assert.match(homepage,/Abrir central de movimentações/);
});
