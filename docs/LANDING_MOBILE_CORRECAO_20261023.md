# AeroMind — Correção da Landing Page para celular

**Data:** 23/10/2026  
**Referência:** quatro capturas Android enviadas pelo usuário e design neon comercial aprovado anteriormente.

## Problema reproduzido
A landing publicada estava bem desenhada para desktop, mas a adaptação para celular não preservava a composição: mockup principal excessivo, cards enormes com texto em cima e demonstração embaixo, rolagem longa e perda da relação visual entre descrição e funcionalidade.

## Correção implementada
- Cabeçalho mobile mais compacto, com CTA **Começar agora** e menu.
- Hierarquia do título, chamada comercial e botões preservados.
- Telefone ilustrativo inclinado mantido inteiro dentro da seção principal, com altura e escala adequadas a 320–520px.
- Benefícios em grade 2×2 com espaçamento reduzido.
- Os três cards passam para **grade de duas colunas dentro de cada card no celular**: texto à esquerda e demonstração da funcionalidade à direita.
- Miniaturas com tamanhos proporcionais e legíveis, sem ultrapassar a caixa nem sobrepor outros elementos.
- Cards têm cerca de **190–196px de altura** no navegador simulado de 320–414px. O conjunto das três demonstrações ocupa cerca de 600px.
- Limites para 320–355px, telas intermediárias até 860px e desktop inalterado acima desse ponto.
- CTAs continuam apontando para **`/planos`**, que conserva o checkout existente.

## Resultados do teste em navegador
Foi usada uma sessão isolada com Chromium/Playwright para validar medidas reais (sem login e sem efetuar pagamentos).

| Viewport | Scroll horizontal | Alturas dos 3 cards | CTA |
| --- | --- | --- | --- |
| 320px | Não | 190 / 192 / 190px | /planos |
| 360px | Não | 190 / 196 / 194px | /planos |
| 390px | Não | 190 / 196 / 194px | /planos |
| 414px | Não | 190 / 196 / 194px | /planos |
| 768px | Sem elementos sobrepostos nos cards | 208 / 210 / 214px | /planos |

- Conferidas as posições de texto, miniatura e contêiner de cada card: sem cortes laterais ou verticais nas miniaturas.
- A borda inferior do mockup que ultrapassava ligeiramente a seção foi corrigida reduzindo a escala de .60 para .58 em telas até 520px.
- Os testes de regressão em `tests/landing-design.test.mjs` cobrem layout mobile, demonstrações e CTAs.
- Verificação final no celular físico deve confirmar qualidade de leitura em configurações de tamanho de fonte acessível.

## Arquivos alterados
- `app/landing-neon.css`: regras responsivas V3.
- `tests/landing-design.test.mjs`: casos de regressão da landing.
- `docs/LANDING_MOBILE_CORRECAO_20261023.md`: registro do ajuste.

## Fora do escopo
Nenhuma alteração feita no login, no app Android, no pagamento Pix, no banco de dados, nos planos comerciais nem no painel administrativo.
