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

test('páginas legais têm informações úteis e não dizem que checkout publicado está desativado',()=>{
 const legal=read('app/[slug]/page.tsx');
 const checkout=read('app/checkout/page.tsx');
 const home=read('app/page.tsx');
 const auth=read('components/auth/AuthShell.tsx');
 assert.match(legal,/Direito de arrependimento/);
 assert.match(legal,/7 dias/);
 assert.match(legal,/Política de privacidade/);
 assert.match(legal,/PaggOne/);
 assert.match(legal,/dados cadastrais e endereço físico/i);
 assert.doesNotMatch(legal,/A contratação permanece indisponível|pagamentos permanecem desativados|documento jurídico em elaboração/i);
 assert.match(checkout,/href="\/reembolso"/);
 assert.match(home,/href="\/reembolso"/);
 assert.match(auth,/href="\/planos"/);
 assert.doesNotMatch(auth,/href="\/#contato"|href="\/#planos"/);
});
test('checkout não menciona PaggPay como provedor comercial obrigatório',()=>{
 const form=read('components/checkout/PixCheckoutForm.tsx');
 assert.match(form,/Pagamento via Pix com provedor externo/);
 assert.doesNotMatch(form,/Pagamento via PaggPay/);
});
