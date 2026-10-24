# AeroMind Gold — Etapa 5: Monitoramento prospectivo, histórico e relatórios

## Escopo
- `/admin/gold/monitoramento?cliente=UUID`: painel protegido para admin/owner, sempre com cliente selecionado.
- Registro **manual** de rodada e sinal com horários atribuídos pelo banco de dados (`clock_timestamp()`). O operador não fornece nem edita o horário, IDs têm restrições e cada rodada/sinal é único por cliente e fluxo.
- A RPC administrativa rejeita um sinal caso o resultado da rodada futura já esteja registrado e exige que a âncora informada seja a última rodada cadastrada no fluxo.
- As alterações são apenas por inserção. Nenhuma ação de atualização/apagamento foi concedida às contas `anon` ou `authenticated`. Admins gravam pelas RPCs com validação de papel no banco e bloqueio transacional por fluxo.
- Três tabelas aditivas: `aeromind_gold_round_observations`, `aeromind_gold_prospective_signals` e `aeromind_gold_report_exports`, RLS ligado, SELECT restrito a funcionários autorizados (admin/owner).
- Relatórios por cliente, perfil e indicador, usando exclusivamente registros cadastrados, até 200 sinais e 200 rodadas recentes; controles de status incluem pendente e sequência inconsistente.
- Comparação Clássico/Refinado/Gold inclui Clássico **somente como referência** enquanto seu filtro original do Android não for auditado.
- Exportação CSV protegida em `/api/admin/gold/export?cliente=UUID`, com auditoria confirmada antes da resposta, sem cache nem dados pessoais.
- Link para o painel na Central Gold e na área de relatórios existente; responsive mobile.

## Limites importantes
1. **Não há captura automática real**. A fonte é identificada como `manual_admin` / `manual_declared`. A ordem de gravação no servidor não prova quando os resultados ocorreram na plataforma. Os dados *não* são sinais ao vivo validados.
2. A taxa exibida é frequência do **limiar atingido** em registros manuais. Não corresponde a win/loss, lucro, ROI ou performance financeira.
3. O intervalo maior que 300s é medido entre **recebimentos no servidor**, não valida continuidade do jogo. Uma captura futura verificável exigirá IDs/horários autênticos fornecidos por conector autorizado, integridade e auditoria de cronologia.
4. Sem fonte externa, integração Android, apostas, avisos push ou alertas automáticos. Nenhum dado é fabricado para encher relatórios.
5. Nenhuma alteração em planos Básico, Pro, Ultra, catálogo, Pix, licenças, download, planos Gold, `private.aeromind_gold_rollout`.
6. Gold permanece com `enabled=false` e `checkout_enabled=false`. Módulo Gold é um laboratório administrativo, não libera funcionalidade comercial ao usuário.
7. Até 200 registros de cada tipo são consultados; resultados fora desta janela podem permanecer como pendentes até uma extensão de paginação. A visão identifica apenas o universo consultado, sem afirmar ser histórico exaustivo.
8. O histórico é append-only para papéis de aplicação, mas não há prova criptográfica nem proteção contra administradores com superuser no banco; não alegar imutabilidade absoluta.

## Auditoria e verificação
- SQL de migração validado em transação `BEGIN/ROLLBACK` antes de persistir.
- Nova migração aplicada separadamente, sem tocar cadastros existentes.
- Validar RLS/GRANT, funções, contagens, segurança de exportação, desktop/mobile e erros de rede.
- `tests/gold-phase5.test.mjs` adicionado ao build, com controles de duplicidade, leitura segregada, ordem e CSV.

## Próximos passos antes da liberação real
- Selecionar e validar oficialmente a origem de coleta em conformidade com autorização da plataforma.
- Implementar conector autorizado com autenticação própria, registros assinados, horário de captura fidedigno, deduplicação, detecção de interrupções.
- Separar observações manuais das efetivamente verificadas, mantendo auditoria de decisões antes do resultado.
- Concluir alertas, relatórios filtráveis, G01–G21, integrar Android por último, então decidir a ativação controlada do Gold e de sua venda.
