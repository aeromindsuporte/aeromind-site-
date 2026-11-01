import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('o atalho para o painel está no cabeçalho, não no fim da página',()=>{
 const page=read('app/minha-conta/page.tsx');
 const header=page.split('<header className="account-header account-header-with-panel">')[1]?.split('</header>')[0];
 assert.ok(header,'Cabeçalho da conta ausente');
 assert.match(header,/<nav className="account-header-actions"/);
 assert.match(header,/{isStaff&&<Link href="\/admin" className="account-panel-link"/);
 assert.match(header,/>Painel<\/span>/);
 assert.doesNotMatch(page,/account-admin-entry|id="administrativo"/);
 assert.equal((page.match(/href="\/admin"/g)||[]).length,1,'Somente um link administrativo na página');
});

test('o servidor somente exibe o painel ao proprietário ou administrador com e-mail confirmado',()=>{
 const page=read('app/minha-conta/page.tsx');
 assert.match(page,/client\.auth\.getUser\(\)/);
 assert.match(page,/eq\('user_id',user\.id\)\.maybeSingle\(\)/);
 assert.match(page,/Boolean\(user\.email_confirmed_at\)/);
 assert.match(page,/staffResult\.data\?\.role==='owner'\|\|staffResult\.data\?\.role==='admin'/);
 assert.match(page,/!staffResult\.error/);
});

test('acesso direto à rota e ações administrativas exigem as mesmas permissões',()=>{
 for(const path of ['lib/admin-access.ts','app/admin/page.tsx','app/admin/actions.ts']){
  const src=read(path);
  assert.match(src,/auth\.getUser\(\)/,path);
  assert.match(src,/!user\.email_confirmed_at/,path);
  assert.match(src,/\['owner','admin'\]\.includes\(staff\.role\)/,path);
  assert.match(src,/redirect\('\/minha-conta'\)/,path);
 }
 const middleware=read('middleware.ts');
 assert.match(middleware,/\/admin\/\:path\*/);
});

test('o botão permanece acessível em celulares estreitos e no topo ao rolar',()=>{
 const css=read('app/auth.css');
 assert.match(css,/\.account-header-with-panel\{position:sticky;top:0/);
 assert.match(css,/\.account-panel-link:focus-visible/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(max-width:355px\)/);
});
