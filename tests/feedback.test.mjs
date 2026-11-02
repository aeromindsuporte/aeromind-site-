import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Conta convida a participar e também oferece atalho de feedback',()=>{
 const home=read('app/minha-conta/page.tsx'), css=read('app/globals.css');
 assert.match(home,/account-feedback-invite/);
 assert.match(home,/Ajude a criar o próximo AeroMind/);
 assert.match(home,/href="\/feedback"/);
 assert.match(home,/shortcut-feedback/);
 assert.match(css,/@media\(max-width:650px\)/);
});
test('Cliente envia opiniões e pode acompanhar respostas em uma área privada',()=>{
 const page=read('app/feedback/page.tsx');
 const form=read('components/feedback/FeedbackForm.tsx');
 assert.match(page,/auth.getUser\(\)/);
 assert.match(page,/redirect\('\/entrar/);
 assert.match(page,/\.eq\('user_id',user.id\)/);
 assert.match(form,/melhoria/);
 assert.match(form,/problema/);
 assert.match(form,/elogio/);
 assert.match(form,/\.insert\(/);
 assert.match(form,/\.select\('id,user_id/);
 assert.match(form,/Sua opinião pode virar/);
 assert.match(form,/admin_reply/);
 assert.match(form,/setSubmitting\(true\)/);
 assert.doesNotMatch(form,/service.role|SERVICE_ROLE/);
});
test('Administrador pode classificar e responder sem expor mensagens publicamente',()=>{
 const page=read('app/admin/feedback/page.tsx');
 const inbox=read('components/feedback/FeedbackInbox.tsx');
 const nav=read('components/admin/CommercialAdminShell.tsx');
 assert.match(page,/await requireAdmin\(\)/);
 assert.match(inbox,/\.update\(\{status,admin_reply:/);
 assert.match(inbox,/em_analise/);
 assert.match(inbox,/implementado/);
 assert.match(nav,/href==='\/admin\/feedback'/);
});
test('Supabase restringe acesso por dono e equipe, com limite de envios',()=>{
 const migration=read('supabase/migrations/20261102060000_feedback_hub.sql');
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/REVOKE ALL ON TABLE public.aeromind_feedback FROM PUBLIC,anon,authenticated/);
 assert.match(migration,/GRANT INSERT\(user_id,category,title,message,rating\)/);
 assert.match(migration,/user_id=\(SELECT auth.uid\(\)\)/);
 assert.match(migration,/role IN \('owner','admin'\)/);
 assert.match(migration,/interval '60 seconds'/);
 assert.match(migration,/>=5 THEN/);
 assert.match(migration,/WITH CHECK \(user_id=/);
});

test('respostas já enviadas aparecem compactas com opção de edição, sem o formulário grande',()=>{
 const inbox=read('components/feedback/FeedbackInbox.tsx');
 const css=read('components/feedback/feedback-admin.css');
 assert.match(inbox,/const \[editing,setEditing\]=useState\(!initial\[0\]\?\.admin_reply\?\.trim\(\)\)/);
 assert.match(inbox,/setEditing\(!x\.admin_reply\?\.trim\(\)\)/);
 assert.match(inbox,/chosen\.admin_reply\?\.trim\(\)&&!editing&&<div className="fba-reply-summary"/);
 assert.match(inbox,/<button type="button" className="fba-edit-reply" onClick=\{beginEdit\}>/);
 assert.match(inbox,/<p className="fba-reply-content">\{chosen\.admin_reply\}<\/p>/);
 assert.match(inbox,/\{editing&&<div className="fba-editor"/);
 assert.match(inbox,/function cancelEdit\(\)/);
 assert.match(inbox,/setEditing\(!data\.admin_reply\?\.trim\(\)\)/);
 assert.match(inbox,/onClick=\{cancelEdit\}/);
 assert.match(css,/\.fba-reply-summary/);
 assert.match(css,/@media\(max-width:500px\)/);
});
