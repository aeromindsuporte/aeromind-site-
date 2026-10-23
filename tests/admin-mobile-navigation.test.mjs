import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('visão geral e páginas internas usam o mesmo controle lateral',()=>{
 const home=read('app/admin/page.tsx');
 const shell=read('components/admin/CommercialAdminShell.tsx');
 const toggle=read('components/admin/AdminMenuToggle.tsx');
 for(const source of [home,shell]){
  assert.match(source,/<AdminMenuToggle\s*\/>/);
  assert.match(source,/id="admin-navigation"/);
  assert.match(source,/className="admin-sidebar-close"/);
 }
 const all=['clientes','licencas','planos','dispositivos','movimentacoes','notificacoes',
  'releases','downloads','cupons','pagamentos','relatorios','suporte'];
 for(const link of all){
  assert.ok(home.includes("'/admin/"+link+"'"),'Falta '+link+' na visão geral');
  assert.ok(shell.includes("'/admin/"+link+"'"),'Falta '+link+' nas páginas internas');
 }
 assert.match(toggle,/aria-expanded=\{open\}/);
 assert.match(toggle,/aria-controls="admin-navigation"/);
 assert.match(toggle,/event\.key==='Escape'/);
 assert.match(toggle,/\.closest\('a,\.admin-sidebar-close'\)/);
 assert.match(toggle,/setOpen\(false\)/);
});

test('barra lateral substitui a antiga faixa horizontal nos celulares',()=>{
 const css=read('app/admin/admin.css');
 assert.match(css,/ADM NAV V2/);
 assert.match(css,/@media\(max-width:1050px\)/);
 assert.match(css,/\.admin-root\.admin-nav-open \.admin-sidebar\{transform:translateX\(0\)/);
 assert.match(css,/\.admin-menu-overlay\{display:block/);
 assert.match(css,/\.admin-root \.admin-sidebar nav,\.admin-root\.admin-nav-open \.admin-sidebar nav\{/);
 assert.match(css,/overflow-y:auto;overflow-x:hidden/);
});

test('o editor não perde o conteúdo ao atualizar e não navega após falha',()=>{
 const shell=read('components/admin/CommercialAdminShell.tsx');
 const component=read('app/admin/notificacoes/NotificationCenter.tsx');
 assert.match(shell,/active!=='\/admin\/notificacoes'&&<AdminAlertsRefresh\/>/);
 assert.match(component,/sessionStorage\.setItem\(LOCAL_DRAFT_KEY/);
 assert.match(component,/sessionStorage\.getItem\(LOCAL_DRAFT_KEY/);
 assert.match(component,/runSafely\(async\(\)=>\{/);
 assert.match(component,/Não foi possível concluir a operação/);
 assert.match(component,/Seu texto é preservado nesta aba/);
 assert.match(component,/nc-return-editor/);
});

test('o editor se adapta à largura real e evita zoom do teclado em smartphones',()=>{
 const css=read('app/admin/notificacoes/notifications.css');
 assert.match(css,/container-type:inline-size/);
 assert.match(css,/@container\(max-width:950px\)/);
 assert.match(css,/@container\(max-width:440px\)/);
 assert.match(css,/font-size:16px!important/);
 assert.match(css,/\.nc-workspace\{grid-template-columns:minmax\(0,1fr\)\}/);
 assert.match(css,/\.nc-editor \.nc-field input\[type="datetime-local"\]/);
});
