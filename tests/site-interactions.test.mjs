import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('navegação mostra resposta imediata sem impedir a ação do link ou do formulário',()=>{
 const layout=read('app/layout.tsx');
 const feedback=read('components/SiteInteractionFeedback.tsx');
 const css=read('app/globals.css');
 assert.match(layout,/SiteInteractionFeedback/);
 assert.match(layout,/Suspense fallback=\{null\}/);
 assert.match(feedback,/addEventListener\('click',handleClick,true\)/);
 assert.match(feedback,/addEventListener\('submit',handleSubmit,true\)/);
 assert.match(feedback,/form\.checkValidity\(\)/);
 assert.match(feedback,/setPending\(false\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/am-page-progress/);
});
test('aprovação confirma no servidor antes de exibir mensagem de sucesso',()=>{
 const actions=read('app/dispositivos/actions.ts');
 const page=read('app/dispositivos/page.tsx');
 const toast=read('components/account/DeviceApprovalToast.tsx');
 assert.match(actions,/aeromind_approve_device/);
 assert.match(actions,/if\(error\|\|data!==true\)/);
 assert.match(actions,/redirect\('\/dispositivos\?status=approved'\)/);
 assert.match(page,/status==='approved'&&<DeviceApprovalToast\/>/);
 assert.match(toast,/Celular autorizado, app liberado!/);
});
test('o painel não é atualizado continuamente durante edição',()=>{
 const refresh=read('components/admin/AdminAlertsRefresh.tsx');
 assert.doesNotMatch(refresh,/setInterval/);
 assert.match(refresh,/visibilitychange/);
 assert.match(refresh,/form:focus-within/);
});
test('catálogo público reutiliza cache com invalidação após salvar',()=>{
 const campaigns=read('lib/campaigns.ts');
 const action=read('app/admin/divulgacao/actions.ts');
 assert.match(campaigns,/unstable_cache\(loadPublicCampaigns/);
 assert.match(action,/revalidateTag\('aeromind-public-campaigns'\)/);
});
