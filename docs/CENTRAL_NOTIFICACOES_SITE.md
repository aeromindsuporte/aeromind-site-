# AeroMind — Central de Notificações do Site (versão administrativa)

## Identidade visual
Design aprovado: interface escura/neon azul, roxo e magenta, com cards de métricas, painel de criação, filtros e catálogo de notificações salvas, pré-visualização no celular e no site. CSS isolado em `app/admin/notificacoes/notifications.css`, sem alterar tabelas dos demais módulos.

## Rotas
- **Admin:** `/admin/notificacoes` — requer conta da equipe AeroMind.
- **Cliente:** `/notificacoes` — precisa estar logado no site; vê apenas seus próprios avisos.
- **Minha conta:** apresenta botão para abrir a caixa de notificações e indica quantas ainda estão válidas e não lidas.

## Ações do administrador
- **Salvar:** cria ou atualiza um rascunho.
- **Salvar como modelo:** deixa mensagem reutilizável no catálogo.
- **Duplicar:** cria rascunho independente sem alterar original.
- **Editar:** altera rascunho/modelo/agendada; mensagens enviadas são reutilizadas em nova cópia.
- **Agendar:** seleciona data/hora; o servidor envia através do Supabase pg_cron.
- **Enviar agora:** exige confirmação explícita e registra entregas individualmente em uma transação.
- **Cancelar agendamento:** devolve a campanha aos rascunhos se ainda não tiver sido disparada.

## Seleção de público
- Todos os cadastrados confirmados.
- Contas com licença ativa.
- Licenças ativas de um plano específico (Básico, Pro ou Ultra).
- Cliente específico (escolhido entre os cadastros recentes disponíveis ao administrador).

A elegibilidade é confirmada **no momento do envio**. Campanhas sem destinatários elegíveis não são marcadas como enviadas.

## Entrega no site
Cada destinatário elegível recebe um registro privado (cópia de título, mensagem, categoria, prioridade, CTA, horário e expiração). O cliente só lê registros com seu próprio `user_id`; pode marcá-los como lidos. Avisos expirados permanecem no histórico com rótulo **Expirada**, sem botão para abrir.

## Agendamento
A extensão `pg_cron` versão 1.6.4 foi habilitada. Job `aeromind_notifications_due_v1` executa a cada minuto `private.aeromind_process_scheduled_campaigns()`. O período de validade começa quando a mensagem é efetivamente publicada. Verificar falhas em `cron.job_run_details`.

## Segurança e auditabilidade
- Acesso de leitura/escrita das campanhas exclusivo à equipe administrativa através de RLS.
- Destinatários podem ler apenas suas próprias entregas.
- Envio por função de banco autenticada e limitada a membros da equipe.
- Sem duplicar destinatários: restrição `unique(campaign_id,user_id)`.
- Não são feitos envios de mensagens de teste em produção.
- Não insira chaves secretas de aplicativos no navegador.

## Importante: Android
**Site** funciona nesta versão. Os controles **App** e **Push** são exibidos como **Em breve** e estão desabilitados até a integração do próximo APK (FCM / token de dispositivo / opt-in). A prévia de celular é demonstrativa: não indica envio de push real.

## Verificações esperadas
- [x] Schema, políticas RLS, funções de despacho e agendamento criados.
- [x] Job pg_cron ativo; histórico recente de execuções com status `succeeded`.
- [x] Teste de entrega em transação revertida, sem mensagens de teste persistidas.
- [x] Testes automatizados de estrutura e segurança incluídos no `npm run build`.
- [ ] Teste funcional autenticado real no navegador: administrador salva e envia e um usuário acessa a própria caixa.
- [ ] Comparação manual do layout com imagem aprovada em celulares físicos.
- [ ] Integração Android para push remoto (próxima etapa).
