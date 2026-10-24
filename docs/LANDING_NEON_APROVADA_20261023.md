# Landing AeroMind — Design comercial aprovado

## Referência
Imagem aprovada: `landing_page_neon_aeromind_para_aviator.png` (revisão com nomes dos três blocos e multiplicadores).

A página `/` foi reconstruída como componentes HTML/CSS responsivos, com elementos de interface reais, botões clicáveis e foco por teclado. Não depende de uma imagem única com texto rasterizado, que ficaria ilegível no celular.

## Correspondência com o design
- Cabeçalho escuro, logo gradiente ciano/roxo/rosa e navegação Início, Funcionalidades, Como funciona, Depoimentos, Planos.
- **Começar agora** no cabeçalho e na seção principal: **`/planos`**.
- Título principal: **Mais clareza para suas decisões no Aviator**.
- Botão secundário **Ver funcionalidades**: âncora `#funcionalidades`.
- Mockup de telefone com indicadores demonstrativos BAIXA **1.58x**, MEDIANA **2.16x**, ALTA **3.03x** e ALTO RISCO **20.59x**, Radar AeroMind e gráfico ilustrativo.
- Três cards com os nomes aprovados: **Indicador de Crash**, **Indicador de minutos de rosa** e **Resultados dos indicadores de rosa**.
- Paleta neon escura, bordas luminosas, degradês, relevo de botões e visualizações demonstrativas.
- Mobile: menu colapsável, texto escalável, telefone reordenado, cards empilhados e botões sem corte lateral.

## Jornada de conversão
1. O visitante abre `/`.
2. Clica em **Começar agora**, no topo ou no destaque principal.
3. O site abre `/planos`, página existente que apresenta os preços configurados pelo administrador.
4. Escolhe um plano publicado e prossegue para `/checkout?plano=...` com pagamento Pix.

**A vitrine, checkout, licenciamento, suporte, painel administrativo e banco existentes não foram alterados.**

## Transparência
Os números e gráficos na landing são **ilustrativos**. As análises e histórico não garantem resultados futuros. Não foram incluídos depoimentos inventados; a seção correspondente explica que poderão ser publicados depoimentos autorizados quando disponíveis.

## Validações
- Testes automatizados: `tests/landing-design.test.mjs`.
- Build Next.js na Vercel.
- Requisitos de revisão manual: conferir o layout em 360, 390, 768, 1280 e 1672 px; abrir menu mobile; seguir CTA até a lista de planos; verificar se os valores publicados nos cards de planos são reais.

## Arquivos
- `app/page.tsx`: landing.
- `app/landing-neon.css`: estilos isolados e responsivos.
- `tests/landing-design.test.mjs`: regressão dos CTAs, seções e informações demonstrativas.

> Não tratar dados de demonstração como resultados de estratégias. Não usar capturas com saldos financeiros como promessa de retorno.
