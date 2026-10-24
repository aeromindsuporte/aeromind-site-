# AeroMind — Correção do WhatsApp solicitado repetidamente

Data: 24/10/2026

## Verificação feita
- `app/minha-conta/page.tsx` sempre exibia o formulário, mesmo após um número cadastrado, transmitindo a impressão de que era obrigatório recadastrar a cada login.
- Conferência agregada do banco mostrou 2 perfis e **0 números persistidos**. Os registros atuais são anteriores ou não concluíram o salvamento do telefone, que não pode ser recuperado automaticamente.
- A hipótese inicial de falha do `CHECK` de formato foi **descartada** após teste específico de expressão armazenada.
- O teste transacional com papel `authenticated`, identidade de perfil existente e número **fictício** E.164 confirmou que `UPDATE profiles` via RLS funciona; `ROLLBACK` garantiu que nenhuma conta real foi modificada permanentemente.
- A trigger de criação de perfil já lê `raw_user_meta_data.whatsapp_e164`, mas as duas contas atuais não continham esse campo em seus metadados antigos. A correção não inventa ou altera números dos clientes.

## Alteração entregue
- O componente `AccountWhatsApp` exibe **WhatsApp cadastrado** e botão **Alterar WhatsApp** quando `initial` vem do Supabase.
- O formulário é apresentado automaticamente apenas quando o banco não contém um número ou o usuário optou por editar.
- Após salvar, o componente verifica a linha atualizada **e efetua leitura adicional do banco**, antes de informar sucesso e mostrar o resumo cadastrado.
- Falha ao carregar o perfil é apresentada como erro, não como "número ausente", evitando cadastros duplicados.
- O cliente pode continuar alterando ou retirando o número e consentimento de marketing. O WhatsApp não é armazenado em localStorage.
- O layout foi adaptado para telas pequenas e adicionado `tests/whatsapp-persist.test.mjs` à compilação.

## Importante
- Usuários antigos cujo número ainda não está no banco precisam cadastrá-lo **mais uma vez**. Quando a gravação for confirmada, novas sessões não devem pedir o número novamente.
- Nenhum cliente teve o número restaurado artificialmente e nenhuma migração de dados pessoais foi feita.
- Planos Básico/Pro/Gold, pagamentos Pix, licenças e APK não foram alterados.
- Limitação de teste: a correção foi validada por testes automatizados e transação SQL revertida; ainda cabe verificar a interação manual autenticada em dispositivo real.
