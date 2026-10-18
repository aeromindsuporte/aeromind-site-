# PaggPay — homologação PIX, SEM cobranças de produção
A chave anteriormente divulgada deve ser revogada; não reutilizar. Os segredos novos devem ser configurados somente no ambiente do servidor.

Estado: PAGGPAY_MODE=disabled por padrão. O endpoint de criação só funciona em sandbox para administradores autenticados e com cinco variáveis server-only preenchidas: PAGGPAY_MODE=sandbox, PAGGPAY_API_KEY (sandbox), PAGGPAY_WEBHOOK_SECRET, PAGGPAY_WEBHOOK_URL, SUPABASE_SERVICE_ROLE_KEY.

A criação do pedido utiliza valores da tabela oficial de planos, nunca preços enviados pelo cliente. O webhook exige timestamp recente e assinatura HMAC do corpo bruto. A função PostgreSQL de fulfillment valida id de evento único, referência e valor antes de ativar ou renovar licença. Há limitação de quatro pedidos por hora/cliente.

Revisar no sandbox as respostas reais do endpoint POST /pix e o corpo do evento de confirmação antes de liberar a clientes; formato desconhecido falha fechado. Rodar testes de cobrança aprovada, expirada, webhook repetido, webhook falso, valor diferente, renovação e captura de eventos fora de ordem. Produção requer aprovação independente e nova configuração segura (a rota não aceita PAGGPAY_MODE=production atualmente).

Fontes oficiais: https://docs.paggpay.com/ e https://paggpay.com/
