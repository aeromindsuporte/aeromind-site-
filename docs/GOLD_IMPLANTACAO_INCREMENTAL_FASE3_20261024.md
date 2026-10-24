# AeroMind Gold — fase 3: localização de cliente e versões (24/10/2026)

## Escopo implantado nesta ramificação

- `/admin/gold` ganhou busca administrativa de clientes existentes por nome ou e-mail, reutilizando a RPC segura `aeromind_admin_search_customers`.
- Selecionar uma conta exibe status de autorização Gold, vencimento, última versão de parâmetros e links para o gerenciamento completo do cliente.
- Concessão, revogação e configurações seguem usando exclusivamente `aeromind_gold_admin_set_access` e `aeromind_gold_admin_save_config`; a seleção do cliente é preservada após a gravação.
- Histórico individual: até 50 configurações versionadas e 50 registros de auditoria, com data e justificativa. Os filtros são descritos em português após validação do catálogo.
- Consulta das três tabelas Gold usa `user_id` selecionado, autenticação administrativa e políticas RLS existentes; não houve novas permissões ou funções no banco.
- Layout com busca, resultados e histórico responsivos; nenhuma edição de versões anteriores por acesso direto ao banco.

## Proteções e limites

- Gold continua sem checkout próprio e com rollout desativado; aplicativo Android permanece a última etapa.
- Não modifica planos Básico/Pro/Ultra, licenças base, catálogo, preços, pedidos Pix, clientes ou documentos fiscais.
- A página exige papel `admin` ou `owner`. A seleção de cliente exige UUID sintaticamente válido.
- A busca é propositalmente limitada aos 50 resultados retornados pela RPC existente; para outros resultados, é preciso refinar a busca.
- Histórico exibido é limitado a 50 versões/eventos. Registro anterior não é excluído nem sobrescrito.
- Todas as alterações que concedem ou revogam Gold exigem motivo e passam pelas RPCs com auditoria no banco.

## Verificação

Teste `tests/gold-admin-history.test.mjs` agregado à compilação Next.js; confirmar também build de prévia e navegação responsiva com conta autorizada antes de produção.

Nenhum backup novo, migração do banco, teste manual com usuário real nem teste de venda Gold foram realizados nesta fase. O funcionamento depende das RPCs e políticas já existentes no Supabase.

## Próximas frentes

1. Validar busca, concessão, revogação, histórico e auditoria com contas de teste em ambiente autorizado.
2. Preparar relatórios Gold, comparação prospectiva, exportação CSV e alertas sem ativar sinais retrospectivos.
3. Homologar cobrança Gold segregada dos pedidos existentes, sem cobrar clientes antes de autorização comercial.
4. Integrar o aplicativo Android por último, com testes ponta a ponta antes de ativar rollout e checkout.
