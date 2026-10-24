# AeroMind — Teste Grátis Premium, design aprovado (24/10/2026)

## Objetivo
Reproduzir a tela comercial neon aprovada em 24/10/2026 para a modalidade de teste gratuito por horas, com animações suaves, destaque para a ativação e disponibilidade verídica.

## Interface
- Cabeçalho atual de planos, título "Experimente o AeroMind" e avião decorativo iluminado.
- Card de disponibilidade limitada com relógio luminoso e contador circular.
- Card gratuito Premium: sem Pix/cobrança; duração do catálogo; GRÁTIS; Monitoramento Premium, Histórico, Acesso por tempo definido.
- Regras existentes: e-mail confirmado, uma utilização por conta, sem histórico prévio de licença.
- Selo "LIBERAÇÃO ATIVA", botão de ativação com brilho pulsante e seta em movimento, instrução para baixar o monitor após ativar.
- Respeito a `prefers-reduced-motion` e larguras de 320 a 1280px.
- Sem depoimentos, números aleatórios, usuários ou procuras fictícias.

## Fonte verdadeira das vagas
- Tabela privada `public.aeromind_free_trial_batches` com lote inicial **12/12** para `teste-horas`, porque o design aprovado exibe 12.
- RPC pública `aeromind_public_free_trial_slots(p_slug)` expõe somente as vagas restantes do plano gratuito visível.
- A mesma transação que cria a licença desconta uma vaga com `UPDATE ... WHERE remaining > 0`, sob lock de linha; em caso de falha, tudo é revertido.
- A contagem é consultada periodicamente no navegador e ao retornar para a aba. Não é alterada artificialmente.
- Quando o lote acabar, a página mostra **LOTE ESGOTADO** e oferece os planos disponíveis; a RPC de ativação também bloqueia novas licenças do lote.

## Premium
- No catálogo, o teste `teste-horas` mudou de `Básico` para o nível técnico `Pro`, usado comercialmente como **Premium**.
- O prazo continua sendo **1 hora**, e o preço permanece **R$0**.
- A ativação gera uma licença `Pro` (não apenas uma promessa de recursos Premium na tela).
- Os demais planos e o checkout Pix não foram alterados.

## Administração e manutenção do lote
A tabela mantém `capacity`, `remaining` e `enabled`. A capacidade é real e deve ser controlada pelo administrador — não por números simulados.
Para configurar um novo lote depois de analisar as liberações:
1. Verificar a quantidade de ativações registradas em `aeromind_free_trial_claims` desde a abertura do lote atual.
2. Definir conscientemente a nova capacidade e as vagas ainda disponíveis.
3. Atualizar a tabela apenas por um usuário de banco autorizado, nunca pelo navegador ou pela conta de um cliente.

**Não aumentar ou diminuir a contagem só para criar urgência.**
Um painel administrativo de gestão de lotes poderá ser adicionado futuramente, mas não integra esta atualização.

## Arquivos
- `app/teste-gratis/page.tsx` — composição e ações existentes de ativação.
- `app/teste-gratis/trial-premium.css` — visual animado responsivo.
- `components/trial/TrialAvailability.tsx` — contador público verídico.
- `app/teste-gratis/actions.ts` — erro específico para lote esgotado.
- `supabase/migrations/20261024110000_premium_trial_real_slots.sql` — esquema, catálogo e proteção transacional.
- `tests/free-trial-premium.test.mjs` — testes de regressão.

## Limites de validação
A leitura real no Supabase e a interface não autenticada foram testadas. Não foi consumida uma vaga nem criada licença de cliente durante testes, para preservar a oferta comercial.
