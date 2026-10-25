# AeroMind Aurora — Vitrine Pro e Gold e Central de Divulgação

**Status:** preparação comercial. **Não habilita vendas Gold, cobrança, sinal ao vivo ou funções da APK.**

## Páginas
- `/` — vitrine editorial Pro e Gold abaixo das funcionalidades, mantendo o mockup e a landing previamente aprovados.
- `/planos` — Pro sem preço publicado encaminha para a página explicativa, nunca checkout; quando plano Pro publicado com preço válido, usa o checkout Pix existente. Card Gold permanece informativo e não possui checkout.
- `/pro` — apresentação Pro, Radar CORE 3 / AMPLIADO 5 / EXPANDIDO 7 **planejado** para Aurora, 4 períodos com preços apenas se publicados no catálogo.
- `/gold` — apresentação com EXPANDIDO 7, Gold Rosa 10x de 2 e 8 observações, sistema antigo preservado, avaliação experimental e aviso visível de venda inativa.

## Administração
- `/admin/divulgacao` — central para textos de duas campanhas, editor de etiqueta, título, descrição, selo, botão, 2–6 benefícios, visibilidade editorial, justificativa e prévia; links para páginas públicas e painel de preços; mensagem de divulgação copiável.
- Indicadores de prontidão Pro por duração, derivados do catálogo real, e estado Gold derivado da RPC administrativa existente.
- Histórico auditável de alterações de marketing separado de configurações operacionais Gold e de pedidos.

## Banco
- Tabelas `public.aeromind_tier_campaigns` e `public.aeromind_tier_campaign_audit` com RLS habilitado.
- Campanhas legíveis publicamente somente quando `visible=true`; administradores visualizam rascunhos. Nenhuma permissão direta INSERT/UPDATE/DELETE concedida a anon/authenticated.
- Escrita somente por função SECURITY DEFINER `aeromind_admin_save_tier_campaign` com dupla checagem da função administrativa e campo de justificativa. Uma correção de alias do RETURNING está em migração separada.
- **Preços e licenças nunca são alterados** por funções de divulgação.

## Estado real confirmado em 25/10/2026
- Pro mensal/trimestral/semestral/anual: **sem preço e ocultos**.
- Gold: `private.aeromind_gold_rollout.enabled=false` e `checkout_enabled=false`.
- Campanhas Pro e Gold: visíveis como apresentação, sem transacionar nem destravar serviços.
- Recursos Aurora que dependem da APK são descritos como planejados, não como disponíveis no aplicativo atual.

## Próxima ação comercial
1. Validar a página pública em celular.
2. Definir os preços Pro no catálogo administrativo e publicar apenas após verificar integração da licença e recursos correspondentes.
3. Concluir e validar APK Aurora.
4. Homologar Gold e só então decidir ativação formal do checkout; o editor de marketing não executa essa ativação.
