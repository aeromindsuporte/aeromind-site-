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


test('botão flutuante do ADM mostra atendimentos com mensagens não lidas',()=>{
 const widget=source('components/support/AdminFloatingSupport.tsx');
 const shell=source('components/admin/CommercialAdminShell.tsx');
 const shared=source('components/support/SupportChat.tsx');
 const root=source('app/layout.tsx');
 const main=source('app/admin/page.tsx');
 const styles=source('components/support/admin-floating-support.css');
 assert.match(root,/<SupportFloatingChat\/>/);
 assert.match(shared,/if\(route\?\.startsWith\('\/admin'\)\)return <AdminFloatingSupport\/>/);
 assert.match(shared,/if\(route==='\/suporte'\)return null/);
 assert.doesNotMatch(shell,/<AdminFloatingSupport\/>/);
 assert.doesNotMatch(main,/<AdminFloatingSupport\/>/);
 assert.match(main,/admin-root area-/);
 assert.match(widget,/Atendimento aos clientes/);
 assert.match(widget,/aeromind_support_chat_unread_count/);
 assert.match(widget,/aria-expanded=\{open\}/);
 assert.match(widget,/unread>0/);
 assert.match(widget,/asf-badge/);
 assert.match(widget,/<SupportAdminChat compact\/>/);
 assert.match(widget,/setInterval/);
 assert.match(widget,/visibilityState==='visible'/);
 assert.match(styles,/\.asf-panel/);
 assert.match(styles,/@media\(max-width:560px\)/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
});
test('janela compacta mantém lista e conversa separadas e só marca lida quando cliente é selecionado',()=>{
 const chat=source('components/support/SupportAdminChat.tsx');
 assert.match(chat,/compact=false/);
 assert.match(chat,/compact\?null:initialTicket\|\|null/);
 assert.match(chat,/compact\?'inbox':'conversation'/);
 assert.match(chat,/const id=idRef\.current&&list\.some/);
 assert.doesNotMatch(chat,/list\[0\]\?\.id\|\|null/);
 assert.match(chat,/Never select a ticket implicitly/);
 assert.match(chat,/if\(compact\)setMobileView\('conversation'\)/);
 assert.match(chat,/aeromind_support_chat_seen/);
 assert.match(chat,/function backToInbox\(/);
 assert.match(chat,/sa-compact-hidden/);
 assert.match(chat,/sa-back-to-inbox/);
 assert.match(chat,/viewport\?\.scrollTo/);
 assert.match(chat,/aeromind_support_chat_send/);
 assert.match(chat,/aeromind_support_chat_set_status/);
});

test('avisos de novas mensagens ficam visíveis nos dois botões antes de abrir o chat',()=>{
 const user=source('components/support/SupportChat.tsx');
 const staff=source('components/support/AdminFloatingSupport.tsx');
 const userCss=source('components/support/support-chat.css');
 const staffCss=source('components/support/admin-floating-support.css');
 assert.match(user,/combinedUnread>0&&<button type="button" className="sc-new-message-alert"/);
 assert.match(user,/Você recebeu uma nova mensagem/);
 assert.match(user,/window\.addEventListener\('focus',onFocus\)/);
 assert.match(user,/if\(!chatError\)setUnread/);
 assert.match(staff,/ready&&unread>0&&<button type="button" className="asf-incoming-alert"/);
 assert.match(staff,/Nova mensagem de cliente/);
 assert.match(staff,/visibilitychange/);
 assert.match(staff,/if\(error\)\{setLastError\(true\);return;\}/);
 assert.match(userCss,/\.sc-new-message-alert/);
 assert.match(staffCss,/\.asf-incoming-alert/);
});
