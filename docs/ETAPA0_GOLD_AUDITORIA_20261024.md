# AeroMind — ETAPA 0 (24/10/2026)
**Status:** inventário inicial e referência de código concluídos. Backup restaurável de banco e homologação isolada pendentes.
**Regra principal do proprietário:** o Gold será implantado sem bloquear o uso nem a venda dos planos Básico, Pro e Ultra, sem modificar o Pix, o painel, os usuários ou as funcionalidades previamente contratadas. O app Android fica para a última etapa de desenvolvimento.

## Inventário confirmado
- GitHub: `aeromindsuporte/aeromind-site-`, produção em `main`, commit-base `58a03e63daae3a578bba53fdfbf7906121321ff7`.
- Referência independente do código anterior ao Gold: `baseline/20261024-pre-gold-preservar-planos`. **Não é backup de banco.**
- Vercel: projeto `aeromind-site`, domínio `aeromind-site.vercel.app`; publicação mais recente consultada `READY` no mesmo SHA. Nenhuma publicação realizada pela Etapa 0.
- Supabase: projeto `aeromind`, região sa-east-1, estado ACTIVE_HEALTHY, 22 tabelas públicas com RLS habilitado. Sem branches de homologação identificados.
- Catálogo: 14 modalidades; Básico, Pro, Ultra e testes. Somente `teste-horas` (Pro/Premium, 1h, preço zero) constava visível na auditoria. Os outros planos **continuam cadastrados e não foram alterados**.
- Licenças: modelo existente `licenses` usa `plan_name`, `status`, `valid_until`, `max_devices`. No momento consultado: 1 licença ativa Básico. Pedidos Pix: 3 (1 pago, 2 falhas).
- Checkout existente: PaggPay Pix com pedidos, retorno, webhook, verificação/reconciliação. Variáveis de gateway configuradas para produção; disponibilidade operacional não validada com compra neste ciclo.
- Não existem ainda as tabelas `entitlements`, `gold_configs`, `billing_events` ou `app_entitlements`. Gold deve ter permissão **explícita e adicional**, nunca inferida do nome Pro/Premium.
- Android: fonte v0.27.2-comercial, versão de código 46, pacote `com.aeromind.monitor`; checksum do ZIP fornecido no relatório completo anexado ao projeto. Não modificado.

## Regras de implantação sem regressão
1. **Não alterar catálogo, preços ou visibilidade** dos produtos existentes em etapa de Gold sem autorização comercial específica.
2. **Não substituir `licenses.plan_name` por Gold**, nem revogar, encurtar ou limitar contratos existentes.
3. Introduzir `gold_access` separadamente, validado no servidor. Gold desligado/indisponível bloqueia **somente funcionalidades Gold**, nunca os demais produtos, Pix, login ou app.
4. Não criar chamada de checkout Gold sem integração e testes; manter Gold em modo de informação/"em breve".
5. Fazer migrações **aditivas, reversíveis e compatíveis** após backup restaurável e homologação. Não executar mudanças destrutivas no banco em produção.
6. Regressão necessária: cliente antigo com Básico/Pro/Ultra, renovação de licença, dispositivo, notificações, suporte, edição de planos, checkout e Pix funcionam antes e depois.

## Pendências da proteção antes de alterar o banco
- **Não comprovados:** backup restaurável do banco, retenção e teste de restauração; o conector consultado não disponibiliza verificação/restauração de backups.
- **Não encontrado:** ambiente Supabase de homologação. Criar somente após avaliar custo e isolamento dos dados; não usar escrita em produção para testes Gold.
- **Não comprovados:** proteção de branch principal (endpoint de proteção negou acesso), gateway sandbox/teste e teste ponta a ponta dos pagamentos.
- **Avisos de segurança Supabase:** 3 WARN (papéis executando funções SECURITY DEFINER, proteção contra senhas vazadas desabilitada) e 1 INFO (RLS sem policy em tabelas). Avaliar com cuidado; não alterar produção sem revisão.

## Resultado
A Etapa 0 gerou linha de base, inventário e roteiro de recuperação. **Nenhuma licença, pagamento, plano ou código publicado foi modificado.** Etapa 1 depende da recuperação de dados e do ambiente de testes; vendas e uso atuais continuam livres dessa restrição.
Documentos completos no projeto: `AeroMind_ETAPA0_Auditoria_Protecao_2026-10-24.md`, `AeroMind_Documento_de_Atualizacoes-4.md` e `Plano_de_Implantacao_AeroMind_Gold_v2.md`.
