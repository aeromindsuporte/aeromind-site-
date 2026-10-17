# Área de acesso AeroMind — implantação e checklist

### Implementado no branch feature/login-supabase-v1
- Layout de login, cadastro, recuperação e redefinição seguindo o mockup aprovado.
- Supabase Auth (e-mail/senha) com cookies via @supabase/ssr.
- Callback PKCE no servidor e middleware para /minha-conta e /download.
- Tabelas profiles e licenses com RLS. Cadastro cria perfil, mas **nunca concede licença**.
- Páginas da conta e download consultam autenticação real.
- Fluxos comerciais, pagamentos, APK e painel administrativo **não** estão ativos.

### Configuração obrigatória do Supabase Dashboard
Em Authentication > URL Configuration:
- Site URL: https://aeromind-site.vercel.app
- Redirect URLs (adicionar exatamente estas entradas):
- https://aeromind-site.vercel.app/auth/callback
- https://aeromind-site.vercel.app/auth/recovery
- https://aeromind-site-git-feature-login-sup-0afd8e-aeromindsuporte-8479.vercel.app/auth/callback
- https://aeromind-site-git-feature-login-sup-0afd8e-aeromindsuporte-8479.vercel.app/auth/recovery
- Para testar localmente, adicione http://localhost:3000/auth/callback
- Preview da Vercel precisa ter a URL de callback explicitamente autorizada antes de usar confirmação por e-mail.

Em Authentication > Providers > Email: verifique confirmação de e-mail ativa.
Configure o SMTP próprio antes de abrir cadastro ao público, pois o SMTP padrão tem restrições.

### Variables Vercel
NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (somente chave publicável, jamais service_role).
Em desenvolvimento local use .env.local que está ignorado pelo git.

### Testes antes do merge/deploy
1. npm install; npm run build; verificar erros de TypeScript.
2. Testar cadastro + recebimento do e-mail + confirmação + login.
3. Testar senha errada, recuperar senha, confirmar link expirado e logout.
4. Testar acesso sem login a /minha-conta e /download e acesso com login.
5. Criar duas contas testes e confirmar que RLS impede acesso cruzado.
6. Confirmar que nenhum usuário consegue criar/alterar licenses.
7. Conferir layout mobile e desktop com design aprovado.

Apenas após isso promover para main e executar um deploy de produção.

### Correção do redirecionamento de recuperação
Os links de confirmação/cadastro não usam query params no callback. A recuperação de senha utiliza uma rota própria /auth/recovery que troca o code PKCE por sessão e redireciona para /redefinir-senha. Se o Supabase não autorizar a URL exata, ele poderá enviar o usuário para a Site URL (home da produção); conferir allowlist e template Reset Password antes de testar.

A conexão PKCE depende dos cookies do navegador que iniciou a recuperação. Abrir o link de e-mail num navegador diferente pode falhar; nesse caso tentar abrir o fluxo inteiro no mesmo navegador ou futuramente migrar o template para token_hash validado no servidor.
