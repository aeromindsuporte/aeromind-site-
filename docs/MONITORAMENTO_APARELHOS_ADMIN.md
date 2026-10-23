# AeroMind — Monitoramento de aparelhos e notificações administrativas

## Objetivo
Registrar automaticamente vínculos, autorizações, reativações, revogações e pedidos de troca de aparelhos. Histórico fica no cadastro do cliente e na Central de movimentações do administrador.

## Acessos
- Admin: `/admin/movimentacoes` — filtros por pendência, revogação, solicitação e novo vínculo.
- Admin: `/admin/cliente/{id}` → aba **Dispositivos** → histórico com origem e horários.
- Cliente: `/dispositivos` → **Solicitar troca ou ajuda com aparelho** (abre formulário em `/suporte` com categoria de dispositivo).

## Registro automático
- O backend já escrevia em `aeromind_device_audit`. Um gatilho copia as ações futuras para `aeromind_device_activity`, com cliente, aparelho, responsável e data.
- O registro é feito na transação da ação original; não altera os limites ou permissões dos aparelhos.
- Chamados classificados como `dispositivo` ou cujo assunto menciona revogação/aparelho/celular também geram evento, com link para o suporte. Texto da mensagem privada não é copiado para notificação.
- Histórico anterior importado como **verificado**; não gera falsos alertas de movimentações antigas.
- `reviewed_at` é um status de leitura administrativa. Marcar como verificado **não reautoriza** aparelhos nem resolve chamados.
- Avisos são consultados ao abrir telas administrativas e atualizados aproximadamente a cada 90 segundos enquanto a aba está visível; não são notificações externas/push.

## Permissões
- RLS da tabela permite leitura somente para funcionários confirmados via `private.aeromind_verified_staff()`.
- Escrita direta é bloqueada para visitantes/clientes. Gatilhos do banco criam eventos.
- Os RPCs administrativos validam a equipe no servidor antes de consultar e marcar leitura.
- Não expor `service_role` ou senhas em navegadores ou scripts.

## Testes importantes
1. Cliente aprova/revoga aparelho → histórico da ficha e alerta administrativo.
2. Administrador revoga aparelho → evento com ator administrativo.
3. Cliente solicita troca no suporte → chamado e notificação vinculados.
4. Abrir cadastro e chamado a partir do evento.
5. Marcar evento como verificado, recarregar, confirmar contador atualizado.
6. Usuário comum não pode ler o histórico geral nem usar RPC de administração.
7. Telas 320–430 px, navegação por teclado e filtros.
8. Não modificar licença, limite de dispositivos, pagamento e funcionamento Android.

## Migrações
- `supabase/migrations/20261023180000_device_activity_center.sql`
- `supabase/migrations/20261023180500_device_activity_admin_feed.sql`

**Aplicadas ao Supabase de produção:** projeto `kyzgrkeawlalpmhqjvub`, em 23/10/2026. Confirmar deploy front-end antes de declarar a interface em produção.
