# PaggPay — homologação PIX, SEM cobranças de produção
A chave anteriormente divulgada deve ser revogada; não reutilizar. Os segredos novos devem ser configurados somente no ambiente do servidor.

Estado: PAGGPAY_MODE=disabled por padrão. O endpoint de criação só funciona em sandbox para administradores autenticados e com cinco variáveis server-only preenchidas: PAGGPAY_MODE=sandbox, PAGGPAY_API_KEY (sandbox), PAGGPAY_WEBHOOK_SECRET, PAGGPAY_WEBHOOK_URL, SUPABASE_SERVICE_ROLE_KEY.

A criação do pedido utiliza valores da tabela oficial de planos, nunca preços enviados pelo cliente. O webhook exige timestamp recente e assinatura HMAC do corpo bruto. A função PostgreSQL de fulfillment valida id de evento único, referência e valor antes de ativar ou renovar licença. Há limitação de quatro pedidos por hora/cliente.

Revisar no sandbox as respostas reais do endpoint POST /pix e o corpo do evento de confirmação antes de liberar a clientes; formato desconhecido falha fechado. Rodar testes de cobrança aprovada, expirada, webhook repetido, webhook falso, valor diferente, renovação e captura de eventos fora de ordem. Produção requer aprovação independente e nova configuração segura (a rota não aceita PAGGPAY_MODE=production atualmente).

Fontes oficiais: https://docs.paggpay.com/ e https://paggpay.com/

## Auditoria preparatória de 2026-10-19

- Executar `npm run test:pix` antes de implantar. Os testes unitários cobrem assinatura HMAC, alteração do corpo, janela de cinco minutos, limite de tamanho e dados de eventos, sem usar a API real.
- Eventos assinados que não seguem o contrato conhecido respondem 503 para que a PaggPay possa tentar novamente; HTTP 422 interromperia os reenvios conforme a documentação oficial.
- O painel `/admin/pagamentos` informa apenas se as cinco configurações do sandbox estão presentes, sem exibir valores secretos. Isso **não comprova** que credenciais ou webhooks funcionam.
- No dashboard PaggPay, registrar o endpoint de webhook ou configurar assinatura por cobrança conforme a modalidade documentada. O segredo deve corresponder ao verificador do AeroMind. Não transmitir credenciais via chat ou GitHub.
- Não habilitar cobrança real: o código continua limitado a `PAGGPAY_MODE=sandbox` para administradores. Faltam testes reais de integração do sandbox, duplicidade/idempotência, valor divergente, expiração e renovação, e verificação de acesso autenticado com conta de teste.
- API de referência: https://docs.paggpay.com/.
