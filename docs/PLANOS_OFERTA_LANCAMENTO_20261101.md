# AeroMind · Preparação comercial dos planos (01/11/2026)

## Pesquisa de mercado
Referências públicas consultadas em 01/11/2026 (valores informados nos respectivos sites, sujeitos a mudança):
- Dashboard do Cifrão: mensal R$ 197, trimestral R$ 397, anual R$ 1.524; https://dashdocifrao.com.br/devtools
- Green Sinais: nível Jogador R$ 80/mês e Analista R$ 100/mês, conforme quantidade de salas; https://app.greensinais.com/plans/
- Aviator AI: ofertas por faixa, de US$ 6,49 a US$ 13,99 por mês; https://aiaviator.com.br/pt/plans

As ferramentas não são idênticas em acesso, alcance e recursos. Os preços do AeroMind abaixo são uma **proposta comercial inicial**, não um valor de mercado certificado. Não há promessa de acerto ou retorno financeiro.

## Catálogo preparado no Supabase
Todas as condições abaixo são editáveis pelo administrador. Valores em reais, com descontos apenas até **08/11/2026 às 23h59:59 de Brasília**. Ao vencer, o preço regular volta a ser utilizado no banco para pedidos NOVOS.

| Nível | Ciclo | Dias | Regular | Lançamento |
|---|---|---:|---:|---:|
| Essencial (Básico) | Mensal | 30 | R$ 39,90 | R$ 29,90 |
| Essencial (Básico) | Trimestral | 90 | R$ 99,90 | R$ 79,90 |
| Essencial (Básico) | Semestral | 180 | R$ 179,90 | R$ 149,90 |
| Essencial (Básico) | Anual | 365 | R$ 299,90 | R$ 249,90 |
| Pro Análise | Mensal | 30 | R$ 79,90 | R$ 59,90 |
| Pro Análise | Trimestral | 90 | R$ 199,90 | R$ 159,90 |
| Pro Análise | Semestral | 180 | R$ 359,90 | R$ 289,90 |
| Pro Análise | Anual | 365 | R$ 599,90 | R$ 499,90 |
| Gold Elite (Ultra interno) | Mensal | 30 | R$ 119,90 | R$ 89,90 |
| Gold Elite (Ultra interno) | Trimestral | 90 | R$ 299,90 | R$ 239,90 |
| Gold Elite (Ultra interno) | Semestral | 180 | R$ 539,90 | R$ 429,90 |
| Gold Elite (Ultra interno) | Anual | 365 | R$ 899,90 | R$ 729,90 |

Nenhum plano pago foi automaticamente PUBLICADO. A visibilidade anterior foi preservada, para que preços em preparação não gerem uma promessa de compra nem venda de recursos não liberados. O teste gratuito existente continua como estava.

## Benefícios propostos por categoria
- **Essencial:** Painel Crash B4, resultados registrados, resumo visual, acompanhamento de sessões e suporte.
- **Pro Análise:** tudo do Essencial, com Radar Rosa ampliado, distribuição e Rosa Analytics identificados como planejados, sujeitos à versão e às permissões realmente liberadas no aplicativo.
- **Gold Elite:** tudo do Pro quando disponível, Alto Risco, Agenda Completa, Radar EXPANDIDO 7, Rosa 10x de 2/8 observações e relatórios avançados claramente indicados como em desenvolvimento. Gold continua bloqueado no checkout até ativação deliberada do rollout.

Marketing e permissões do app são coisas diferentes: alterar textos NÃO libera módulos no Android. As licenças preservam seus níveis técnicos Básico, Pro e Ultra (com rótulo comercial Gold).

## Editar prazos / clientes existentes
O editor recebe dias (1 a 730) ou meses (conversão contratual: 1 mês=30 dias, 12 meses=365 dias). O slug do produto não muda, garantindo compatibilidade com pedidos antigos. Ao AUMENTAR um prazo, o servidor estende licenças ativas associadas a compras pagas daquele produto de forma auditada e idempotente, sem duplicar dias. Ao DIMINUIR um prazo, contratos existentes nunca são encurtados. Licenças concedidas manualmente sem vínculo comprovado com uma compra não são modificadas automaticamente: devem ser ajustadas na ficha do cliente para não gerar alterações erradas.

## Segurança da oferta
O site e o checkout calculam preço promocional somente enquanto o prazo está ativo. A função privada de criação do pedido Pix também persiste o preço vigente; cupons visualizam a mesma base. Um pedido Pix já criado mantém o preço daquela compra, inclusive após o vencimento da oferta. O prazo não representa vagas limitadas.

## Validação
- Suite nova de edição, data e popup móvel;
- Compilação Next.js na prévia Vercel;
- RPC administrativo validado em transação temporária no banco;
- Simulação de extensão de licença paga com transação desfeita;
- Conferência de rollback com catálogo e licenças reais preservados.

Testes do gesto de clique em painel autenticado dependem de sessão real do administrador, não acessível nas verificações automatizadas externas.
