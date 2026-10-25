import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('chat do cliente usa autenticação, modal flutuante e histórico das mensagens',()=>{
 const s=source('components/support/SupportChat.tsx');
 assert.match(s,/SupportFloatingChat/);
 assert.match(s,/SupportChatPanel/);
 assert.match(s,/sb\.auth\.getUser\(\)/);
 assert.match(s,/\.eq\('user_id',user\.id\)/);
 assert.match(s,/aeromind_support_chat_send/);
 assert.match(s,/aeromind_support_chat_seen/);
 assert.match(s,/setInterval/);
 assert.match(s,/sc-unread/);
 assert.match(source('app/layout.tsx'),/<SupportFloatingChat\/>/);
});
test('admin recebe chats, mensagens não lidas e pode responder',()=>{
 const s=source('components/support/SupportAdminChat.tsx');
 assert.match(s,/aeromind_support_chat_admin_inbox/);
 assert.match(s,/aeromind_support_chat_set_status/);
 assert.match(s,/aeromind_support_chat_send/);
 assert.match(s,/Notification\.requestPermission/);
 assert.match(s,/document\.visibilityState/);
 assert.match(s,/setInterval/);
 assert.match(source('components/admin/CommercialAdminShell.tsx'),/SupportUnreadBadge/);
 assert.match(source('components/admin/SupportUnreadBadge.tsx'),/aeromind_support_chat_unread_count/);
 assert.match(source('app/admin/suporte/page.tsx'),/requireAdmin/);
});
test('banco permite apenas tickets do próprio usuário e mensagens com controle',()=>{
 const sql=source('supabase/migrations/20261025190000_support_chat_live.sql');
 assert.match(sql,/aeromind_support_chat_send/);
 assert.match(sql,/aeromind_support_chat_seen/);
 assert.match(sql,/aeromind_support_chat_admin_inbox/);
 assert.match(sql,/private\.aeromind_verified_staff\(\)/);
 assert.match(sql,/owner_id<>actor/);
 assert.match(sql,/t\.user_id=actor/);
 assert.match(sql,/p_ticket_id/);
 assert.match(sql,/revoke all on public\.aeromind_support_messages from anon,authenticated/);
 assert.match(sql,/grant select on public\.aeromind_support_messages to authenticated/);
 assert.match(sql,/m\.author_id=t\.user_id/);
});
test('suporte antigo permanece compatível com as RPCs e sem gravações diretas',()=>{
 const s=source('app/suporte/actions.ts');
 assert.match(s,/aeromind_support_chat_send/);
 assert.match(s,/aeromind_support_chat_set_status/);
 assert.doesNotMatch(s,/from\('aeromind_support_messages'\)\.insert/);
 assert.doesNotMatch(s,/from\('aeromind_support_tickets'\)\.insert/);
});
test('layout responsivo nas duas caixas de conversa',()=>{
 assert.match(source('components/support/support-chat.css'),/@media\(max-width:540px\)/);
 assert.match(source('components/support/admin-chat.css'),/@media\(max-width:790px\)/);
 assert.match(source('app/suporte/page.tsx'),/SupportChatPanel/);
});
