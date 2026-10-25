# AeroMind Pro — Rascunhos comerciais preparados em 25/10/2026

## Resultado aplicado ao catálogo Supabase
Os quatro modelos existentes de Pro receberam textos de divulgação, sem mexer em preços, visibilidade, duração, clientes, checkout ou licenças. Antes desta atualização, os campos comerciais estavam vazios.

| slug | título comercial | duração | preço | publicado |
| --- | --- | --- | --- | --- |
| pro-mensal | AeroMind Pro — Mensal | 30 dias | null (a definir) | false |
| pro-trimestral | AeroMind Pro — Trimestral | 90 dias | null (a definir) | false |
| pro-semestral | AeroMind Pro — Semestral | 180 dias | null (a definir) | false |
| pro-anual | AeroMind Pro — Anual | 365 dias | null (a definir) | false |

**Selo**: PRO · PLANO EM PREPARAÇÃO  
**CTA pré-configurado para quando houver oferta válida**: Escolher Pro  
**Texto de preço pendente**: Preço ainda não definido

**Descrição**:
> Acompanhe indicadores e histórico conforme sua licença. A opção Radar Rosa AMPLIADO 5 está planejada para a atualização AeroMind Aurora e dependerá de integração e testes no aplicativo.

**Benefícios**:
1. Indicadores AeroMind e histórico conforme licença.
2. Acompanhamento e organização das sessões.
3. Radar Rosa AMPLIADO 5 planejado para o Aurora.
4. Novos recursos mediante atualização compatível.

O texto comercial não concede permissões ou funcionalidades no Android. O marketing não é um anúncio de que o AMPLIADO 5 já está liberado no app atual.

## Checkpoints de segurança
- Os quatro registros Pro foram conferidos após a escrita: **price_cents null, visible false**.
- `private.aeromind_gold_rollout.enabled=false` e `checkout_enabled=false` continuam desligados.
- Nenhum preço foi inventado ou alterado; somente o proprietário poderá definir valores e autorizar publicação.
- Página pública `/pro` já está instalada e distingue planos disponíveis de planos sem preço.
- Editor em `/admin/planos` permite configurar e publicar quando apropriado.
- A Central de Divulgação em `/admin/divulgacao` controla separadamente a campanha editorial Pro/Gold.

## Próxima fase
1. Proprietário define os preços para os quatro períodos Pro; não publicar automaticamente enquanto não houver confirmação dos recursos efetivamente disponíveis no app.
2. Continuar integração **AeroMind Aurora** a partir de `AEROMIND_AURORA_FONTE_ANDROIDIDE_INTEGRACAO_INICIAL.zip` já recebido no projeto: conectar motores Gold 2R/8R à coleta, preparar telemetria de estudos consentida e testar por perfil.
3. Validar Android SDK/Gradle no ambiente de build e assinatura com chave original antes de considerar a APK instalável.
4. Após integração e teste da APK, homologar permissões CORE/AMPLIADO/EXPANDIDO e condições comerciais. Não habilitar checkout Gold sem autorização posterior.

### Estado
**Textos comerciais Pro realmente salvos no Supabase**; APK Aurora permanece em integração inicial e a venda dos quatro Pro não foi ativada nesta etapa.
