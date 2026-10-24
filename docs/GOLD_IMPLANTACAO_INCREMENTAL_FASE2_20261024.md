# AeroMind Gold — implantação incremental 2 (24/10/2026)

## Entregas implantadas
- Novas tabelas `aeromind_gold_access`, `aeromind_gold_config_versions`, `aeromind_gold_audit`, todas com RLS e sem permissão de gravação direta para contas comuns.
- Flag global `private.aeromind_gold_rollout` com `enabled=false` e `checkout_enabled=false`.
- Funções `aeromind_gold_admin_set_access`, `aeromind_gold_admin_save_config`, `aeromind_gold_admin_overview` e `aeromind_gold_my_entitlement`, com verificações server-side de usuário e de `aeromind_staff`.
- Concessão, revogação e edição de regras restritas e auditáveis, com justificativa obrigatória, validade e configurações versionadas.
- Página `/admin/gold` com formulários, status globais, lista de autorizações e auditoria.
- Página `/minha-conta` com situação Gold separada e link de apresentação.
- Configuração de filtros e alvos por indicador compatível com o catálogo do motor Gold versionado.
- **A venda e o uso do Gold continuam desligados**; a integração Android será a última.

## Proteção comercial
1. Nenhuma migração de `licenses.plan_name` ou de pagamentos existentes.
2. Básico, Pro e Ultra seguem disponíveis como antes; Gold não substitui a licença base.
3. A regra de acesso para futura integração é `app_access AND gold_access AND gold_rollout_enabled AND valid_until>now()`.
4. Mesmo se um administrador cadastrar um acesso de teste Gold agora, ele não será liberado no Android enquanto o rollout estiver desligado.
5. O painel Gold não envia Pix, não modifica os preços do catálogo e não publica planos Gold para compra.
6. `Ultra` permanece identificado tecnicamente em cadastros e contratos legados, mas a vitrine apresenta Gold.

## Verificação da migração
- SQL executado primeiro em transação com `ROLLBACK`. Após o ensaio, as novas tabelas foram confirmadas inexistentes, demonstrando ausência de alteração persistente.
- Migração aditiva aplicada pelo Supabase com `success=true`.
- Confirmadas: 3 tabelas novas, RLS e políticas, usuário comum sem INSERT Gold, anônimo sem RPC administrativa, rollout false e checkout false.
- Antes/depois: 14 modalidades no catálogo, 1 licença e 3 pedidos de pagamento, sem alteração.
- Validador SQL aceitou a configuração padrão e rejeitou objeto vazio e alvo não catalogado.
- Testes automáticos `tests/gold-entitlements.test.mjs` e compilação do Next.js.
- **Não foram concedidas licenças Gold reais durante esta implantação.**

## Próximas etapas
- Testar manualmente, com conta administrativa, concessão, revogação e configuração em ambiente autorizado.
- Histórico de versões navegável, busca de cliente no painel e liberação controlada de alertas/relatórios.
- Integração de pagamento Gold em homologação, sem alterar pagamentos existentes.
- Comparação prospectiva com coleta imutável e segregação por conta.
- Integração final Android, bateria completa de testes G01–G21 e avaliação comercial antes de ativar rollout e compra Gold.

## Riscos e monitoramento
- O backup restaurável do banco ainda não foi comprovado pelo conector. A estratégia de migração aditiva reduz riscos, mas não equivale a backup.
- O Supabase continua a sinalizar avisos de segurança anteriores, inclusive funções SECURITY DEFINER disponíveis a usuários autenticados. As novas funções exigem papel administrativo dentro do servidor, mas auditorias futuras devem continuar.
- Nunca publicar valores Gold inventados nem ativar `enabled` ou `checkout_enabled` antes dos testes finais.
