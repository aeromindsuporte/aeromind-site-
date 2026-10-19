# PaggPay: migração Descont' Saúde -> AeroMind

## Origem técnica
Pacote do outro projeto enviado em 19/10/2026. Os contratos são reconstruídos do código funcional da Descont' Saúde, não representam um teste vivo desta conta PaggPay.

## Comportamentos implementados
1. Banco AeroMind mantém uma única cobrança aberta por usuário (created/pending). A RPC de criação reaproveita a mesma reserva e impede pedido concorrente, inclusive se o cliente seleciona outro plano enquanto há um Pix aberto.
2. POST Pix recebe preço do banco, usa payer_document_number e encaminha X-Paggpay-Webhook-Secret no backend. Lê transaction.id e pix.code, com checagem de valor, referência e BRL.
3. Marca pix_requested_at ANTES do POST. Em timeout, erro ou contrato divergente, não repete o POST e exige consulta/conciliação. O pedido não é liberado automaticamente quando não existe provider ID.
4. Webhook só aceita HMAC válido (corpo bruto e janela de 5 minutos). Dados em event.data.amount, currency_code e transação são validados.
5. Mesmo após HMAC válido, faz GET /pix/{id} ou fallback GET /transactions/{id}. A licença só é concedida quando status succeeded, ID, referência, moeda BRL e centavos coincidem.
6. A função Supabase aeromind_fulfill_pix é idempotente, rejeita provider ID divergente e cria ou renova licenças em transação SQL.
7. Status do próprio pedido pode ser consultado pelo cliente administrador a cada 10s; não há geração de cobrança ao atualizar a página.

## Variáveis privadas
PAGGPAY_MODE (somente sandbox), PAGGPAY_API_KEY, PAGGPAY_WEBHOOK_SECRET,
PAGGPAY_WEBHOOK_URL e SUPABASE_SERVICE_ROLE_KEY.
Acesso a esses valores deve ser configurado diretamente no Vercel, não compartilhar por chat ou GitHub.

## Bloqueios e testes pendentes
- A cobrança REAL permanece desabilitada. Rotas funcionam apenas com modo sandbox e login administrativo.
- Conferir valores e formato real da API PaggPay com credenciais válidas do sandbox, depois testar aprovado, falha, timeout, webhook falso/repetido, conciliação e liberação de licença em conta de teste.
- Com provider ID desconhecido após timeout, não gerar outro Pix automaticamente; conciliação manual é a medida segura.
- Os testes automatizados usam respostas simuladas. Eles não comprovam recebimento de dinheiro, ativação real ou homologação junto à PaggPay.


## Protecao contra interferencia com Descont' Saude (19/10/2026)

A Descont' Saude utiliza `reference_id` UUID simples e banco Supabase `qkepsqxakrduxvsvpdcn`. O AeroMind utiliza exclusivamente `aeromind-{UUID}` e banco `kyzgrkeawlalpmhqjvub`. Depois de validar HMAC, o webhook AeroMind responde 200 e ignora avisos com referencia de outra integracao. Uma referencia malformada com prefixo AeroMind e recusada. A criacao de cobranca no AeroMind exige URL de callback HTTPS da propria aplicacao, evitando apontar para a Descont' Saude.

Os webhooks sao assinados por segredo distinto por integracao/cobranca. Em uma **mesma conta** PaggPay, o saldo financeiro sera compartilhado; estes controles isolam operacoes de software, mas nao criam contas recebedoras nem saldos separados. A API key de producao compartilhada em conversa deve ser rotacionada antes de qualquer uso comercial; ela NAO faz parte do codigo nem das variaveis implantadas. Os testes desta etapa sao simulados; a homologacao live segue pendente.

O webhook da Descont' Saude procura `payment_charges.id` UUID. Se ela receber por engano uma notificacao AeroMind com referencia alfanumerica, a consulta direta a coluna UUID pode gerar resposta HTTP de erro, embora nao libere nem altere uma fatura. Deve receber um filtro de referencia UUID proprio caso ambos recebam todos os eventos de conta por webhook global, alem do callback por cobranca recomendado.
