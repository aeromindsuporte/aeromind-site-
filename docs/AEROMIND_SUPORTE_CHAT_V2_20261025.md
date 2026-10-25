# AeroMind — suporte por chat (site, administrativo e Android)

**Data:** 25/10/2026. **Escopo:** atualizar suporte, preservando chamados existentes.

## Site
- Botão flutuante **Suporte** em páginas públicas e de clientes. Para enviar mensagem, exige login na conta AeroMind.
- A rota `/suporte` passou a exibir conversas no formato de chat e conserva o link `?categoria=dispositivo&assunto=...` vindo do gerenciamento de aparelhos.
- Atendimento por conta com histórico, escolha de conversa, novo atendimento, respostas no mesmo fluxo e status de resolução.
- Atualização automática por consulta periódica; **não** é push do dispositivo fora do site.

## Administrativo
- `/admin/suporte`: lista de clientes, conversa com mensagens, contador de não lidas, resposta, alteração de status e link ao cliente.
- Alerta de não lidas no menu e no cabeçalho, incluindo a tela principal do administrativo.
- Botão **Ativar avisos no navegador**: exige permissão explícita. Mostra alerta de navegador para novas mensagens quando o painel estiver aberto e a aba em segundo plano. Não é push quando navegador fechado.
- Atualiza conversas periodicamente sem recarregar toda a página.

## Banco e segurança
- Tabelas históricas `aeromind_support_tickets` e `aeromind_support_messages` preservadas; migrações aditivas.
- Novas funções `aeromind_support_chat_send`, `_seen`, `_set_status`, `_admin_inbox`, `_unread_count`, `_my_inbox`, `_my_messages`, `_mobile_seen`.
- Exige JWT de usuário, confere proprietário do ticket e funcionário verificado, limita volume de mensagens, não retorna e-mails de outros clientes ao usuário comum.
- Anon não possui grant para ler ou alterar chamados; authenticated pode ler via RLS e escrever somente por RPC.
- Testes transacionais com cliente e ADM passaram; dados de teste revertidos.
- Não houve envio de senhas, credenciais ou números de conta ao sistema de suporte.

## Android
- Projeto-fonte disponível na conversa: `AEROMIND_AURORA_PULSE_CHAT_FONTE_ANDROIDIDE.zip`.
- Pasta interna única **AeroMind_Aurora_Pulse_Chat**, versionCode **49**, versionName **Aurora Pulse Chat**, applicationId `com.aeromind.monitor` preservado.
- Botão flutuante de suporte na tela principal, link no menu e `SupportChatActivity.java` nativa, integrada ao Supabase por `AeroAuth.pulseRpc`.
- Projetado para login válido do app, conversas existentes e envio/recebimento a cada 15 s enquanto aberto.
- Fonte preserva monitor.js e tabela Radar Rosa V4 exatamente; 24 testes Java do núcleo e 15 verificações estáticas passaram.
- **Android SDK e assinatura comercial não disponíveis para build neste ambiente.** APK instalável não foi gerada. Necessário AndroidIDE, mesma assinatura para atualizar por cima e teste real do chat site ↔ app.

## Verificações de homologação
1. Entrar no site como cliente e abrir botão Suporte; enviar mensagem.
2. Abrir `/admin/suporte` com ADM autorizado; verificar badge de não lidas, abrir conversa, responder.
3. Voltar ao chat do cliente e receber resposta; encerrar e abrir novo atendimento.
4. No AndroidIDE, compilar v49 e testar botão flutuante e as mesmas mensagens na conta do app.
5. Verificar que contas diferentes não enxergam mensagens umas das outras e que o navegador não exibe avisos sem permissão.

Checkout, preços, permissões Gold e demais fluxos comerciais não foram alterados.
