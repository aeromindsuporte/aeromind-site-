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


## Atualização da integração para paggOne — 01/11/2026

A documentação oficial `https://docs.paggone.com/` passou a indicar produção em
`https://api.paggone.com/v1`. O sandbox continua em `https://sandbox-api.paggpay.com/v1`.
Os endpoints Pix são `POST /pix` e `GET /pix/{id}`, a autenticação continua por
`Authorization: Bearer <chave>` e os cabeçalhos da assinatura do webhook continuam
`X-Paggpay-Webhook-*`. Não converter centavos em reais sem verificar o contrato.

### Troca controlada na Vercel (projeto aeromind-site)

1. No painel `https://app.paggone.com`, ir a Developer > API Keys e gerar uma chave
   da conta de recebimento correta, com as permissões mínimas necessárias
   (`pix.create`, leitura de Pix e de transações). Nunca enviar a chave por chat.
2. Adicionar **Production** `PAGGONE_API_KEY` como segredo na Vercel. O nome
   `PAGGPAY_API_KEY` permanece guardado separadamente como fallback antigo.
3. Confirmar a URL `PAGGPAY_WEBHOOK_URL=https://aeromind-site.vercel.app/api/pix/webhook`.
   Conferir no painel paggOne o webhook e o segredo HMAC: o código também envia
   `X-Paggpay-Webhook-Secret` em cada criação de Pix. Se o segredo do endpoint
   tiver sido rotacionado, trocar `PAGGPAY_WEBHOOK_SECRET` de forma coordenada.
4. **Só depois de cadastrar a nova chave**, adicionar Production
   `PAGGPAY_PROVIDER=paggone`; manter `PAGGPAY_MODE=live` somente após homologação.
   Criar um novo deploy de produção, pois alterações de environment não mudam
   deployments antigos.
5. Verificar status da API e permissões via teste sem cobrança e depois realizar
   um Pix de homologação conscientemente autorizado. Checar QR, webhook assinado,
   status confirmado por GET, valor em centavos e emissão idempotente da licença.
6. Confirmar inexistência de cobranças pendentes no gateway anterior. Desabilitar
   a credencial antiga só depois de conciliação e validação do novo sistema.

### Compatibilidade e segurança

O seletor `PAGGPAY_PROVIDER` é explícito e o valor padrão é `paggpay`.
Se `paggone` estiver selecionado **sem** `PAGGONE_API_KEY` válida, o checkout
fica desativado (503), sem reutilizar silenciosamente a chave PaggPay. O sistema
não exibe a chave na resposta, não gera Pix duplicado em timeout e não concede
licença sem confirmar transação, moeda, referência e valor no servidor. A integração
ao vivo da conta nova **não está homologada** até completar o teste de cobrança.

Fontes técnicas: https://docs.paggone.com/ e https://paggone.com/.
