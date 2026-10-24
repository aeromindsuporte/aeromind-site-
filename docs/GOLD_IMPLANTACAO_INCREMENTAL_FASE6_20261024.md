# AeroMind Gold — Etapa 6 | Preparação de fonte autorizada e alertas internos

**Data:** 24/10/2026
**Ambiente:** site Next.js + Supabase.
**Situação:** a infraestrutura está pronta para homologação; não existe feed externo, compra Gold nem entrega de alertas automatizados.

## Funções implementadas

- Tabela privada `private.aeromind_gold_source_gate` com estado inicial `not_configured`, `ingestion_enabled=false`, `external_delivery_enabled=false`. Ambas as travas possuem `CHECK(...=false)`; não podem ser ativadas por configuração comum nem por tabela de regras.
- Contrato de evento externo `lib/gold/source-contract.ts`: schema de evento versionado, identificadores, timestamp ISO com fuso, origem obrigatória, multiplicador finito e assinatura HMAC-SHA256 com comparação em tempo constante e tolerância de relógio de dois minutos. Não existe endpoint de ingestão ou segredo exposto no cliente.
- Regra de prévia por cliente, perfil (Refinado/Gold) e indicador (BAIXA/MEDIANA/ALTA): liga/desliga **somente o modo prévia**, alvo mínimo, cooldown de 1–240 min e justificativa obrigatória.
- Salvamento via `aeromind_gold_admin_save_alert_preview_rule`, função administrativa com validação `auth.uid()` e role `admin`/ `owner`; grava auditoria before/after. Tabelas públicas têm RLS e apenas SELECT concedido a authenticated, protegido por políticas de funcionário autorizado.
- `/admin/gold/alertas?cliente=UUID` exibe status da fonte, regras configuráveis, métricas e decisões de **laboratório** a partir de sinais administrativos da Etapa 5, com janela máxima de 180 segundos, cooldown por fluxo/perfil/indicador e bloqueio de duplicidade visual e dados fora de ordem.
- Nenhum candidato de laboratório é publicado, persistido como notificação, enviado por push, WhatsApp, e-mail ou reproduzido retrospectivamente como sinal real.
- Links na Central Gold e no Monitoramento da Etapa 5, com layout mobile-first.
- `tests/gold-phase6.test.mjs` integra o `npm run build` para verificar bloqueio de ingestão/entrega, HMAC, esquema, proteção admin, janelas e regras.

## Distinções obrigatórias

- **Sinal manual** = declaração feita por operador; não prova momento real de uma rodada no provedor.
- **Fonte autorizada validada** = futura conexão homologada, com contrato e licença de acesso aos dados, evento assinado, ID único e timestamp fornecido pelo provedor.
- **Candidato de laboratório** = prévia calculada ao abrir o painel. Não é previsão externa ao vivo nem recomendação de aposta.
- **Limiar atingido** não indica benefício financeiro, ROI, payout ou confiabilidade preditiva.

## Segurança e restrições

- Fonte e delivery seguem *impossíveis* de habilitar sem migração futura deliberada. Nenhuma credencial foi criada, solicitada ou salva no banco.
- O parser valida autenticidade HMAC, mas ainda NÃO garante replay protection durável: a conexão real exigirá ledger de IDs de eventos únicos, verificação de sequência e rastreio de atrasos, além de conferência da documentação do fornecedor.
- A avaliação atual usa no máximo 200 sinais e 200 rodadas por cliente e não recebe chamadas do jogo.
- Cada chamada de mutação exige admin/owner e a RPC faz segunda validação no banco. Clientes comuns não editam as regras.
- Regras Clássico desabilitadas por ausência de auditoria do filtro original Android.
- Não foram modificados planos, licenças, Pix, base de clientes, pagamentos, APK, `private.aeromind_gold_rollout`, nem os critérios do comparador offline.

## Pré-requisitos pendentes para integração de verdade

1. Identificação e **autorização formal do provedor** de dados (API, licença, termos, limites e esquema real).
2. Homologação de autenticação, relógio, ordenação, replay, idempotência, deduplicação, continuidade e procedência.
3. Registro de decisões antes das próximas rodadas por credencial verificada, separado de eventos manuais; backfill nunca será marcado como emissão prospectiva.
4. Preferências de destinatários e consentimento, canal de entrega e política de descadastro, se futuramente aprovado; notificação externa fica desligada até então.
5. Testes de interface administrativos, integração autorizada ponta a ponta e posterior etapa do Android.

**Validação:** migração testada em transação revertida antes de aplicar; verificação de privilégios/RLS e checagem do build no deploy de prévia.
