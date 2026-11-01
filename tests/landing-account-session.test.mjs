import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('site usa uma única verificação de sessão para links do cabeçalho, mobile e rodapé',()=>{
 const home=read('app/page.tsx');
 const links=read('components/home/LandingSessionLinks.tsx');
 assert.match(home,/return <LandingSessionLinks><div className="nl-site">/);
 assert.match(home,/<LandingAccountLink guestHref="\/entrar" guestLabel="Entrar"\/>/);
 assert.match(home,/<LandingAccountLink guestHref="\/planos" guestLabel="Começar agora" className="nl-btn nl-btn-header"/);
 assert.match(home,/<LandingAccountLink guestHref="\/planos" guestLabel="Começar agora" className="nl-btn nl-btn-primary"/);
 assert.match(links,/supabase\.auth\.getUser\(\)/);
 assert.match(links,/supabase\.auth\.onAuthStateChange/);
 assert.match(links,/subscription\.unsubscribe\(\)/);
 assert.match(links,/signedIn\?'\/minha-conta':guestHref/);
 assert.match(links,/signedIn\?'Minha conta':guestLabel/);
});

test('quem já está autenticado não precisa ver o formulário de login novamente',()=>{
 const login=read('app/entrar/page.tsx');
 assert.match(login,/supabase\.auth\.getUser\(\)/);
 assert.match(login,/if\(user\)redirect\('\/minha-conta'\)/);
 assert.match(read('middleware.ts'),/\/minha-conta\/\:path\*/);
});
