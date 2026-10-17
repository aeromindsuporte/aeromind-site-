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
- Redirect URLs: https://aeromind-site.vercel.app/auth/callback
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
