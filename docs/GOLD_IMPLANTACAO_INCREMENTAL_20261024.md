# AeroMind Gold — implantação incremental 1 (24/10/2026)

## Decisão comercial
Prosseguir **agora** com melhorias aditivas e isoladas, sem exigir restauração de backup como etapa normal de desenvolvimento. Backups continuam sendo necessários como proteção em caso de falha; evitar alterações destrutivas e testar antes de disponibilizar.

Básico, Pro, Ultra, Pix, clientes, licenças atuais, downloads, notificações e aplicativo Android devem permanecer funcionando sem depender do Gold. Android continua a última frente de implementação.

## Entrega de código deste pacote
- `/gold`: página informativa responsiva com recursos, Clássico × Refinado × Gold, perguntas frequentes, aviso 18+, sem preço inventado nem botão de compra Gold.
- `/admin/gold`: rota protegida por administrador; situação e links aos painéis existentes. **Ainda não salva concessões Gold.**
- `/planos`: um link informativo para Gold, sem modificar produtos, preços ou checkout existentes.
- `lib/gold/indicators.ts`: catálogo explícito Gold, validação estrita, percentis P25/P50/P75 HALF_UP, coluna 7, filtros (roxos e pagantes), integridade (300/301 e 50 rodadas), Gold iniciando com Refinado, contrato explícito de acesso. Cálculo puro; **ainda não conectado aos sinais reais do Android ou ao backend**.
- `lib/gold/simulator.ts`: balanço **virtual** em centavos, entrada fixa ou percentual, metas/limites diários, validação de saldo e indicador de queda, sem apostas reais; recebe apenas registros explicitamente fornecidos.
- `tests/gold-foundation.test.mjs` e `tests/gold-simulator.test.mjs`: testes de código para partes selecionadas de G01–G05/G07/G10–G12/G14/G17. **Não equivalem à aprovação de G01–G21 ponta a ponta.**
- `package.json`: testes no comando de compilação; nenhum segredo ou configuração de gateway alterados.

## Restrição de segurança
A função `canUseGold` é apenas o predicado de regra de negócio para desenvolvimento: **não** é autorização persistida do servidor e não confere acesso comercial. Gold permanece SEM checkout, SEM novas permissões de produção, SEM licença automática e sem serviços Gold disponíveis no aplicativo.

## Próximos pacotes a implementar
1. Esquema isolado e RPCs seguras de `gold_access` + configurações versionadas + auditoria, depois de assegurar recuperação do banco; sem UPDATE/DELETE nos cadastros existentes.
2. Editor admin real de concessão, prazo, revogação com motivo, logs e acesso de cliente.
3. Revisões de pagamentos/webhooks/upgrade em **homologação**; Gold pago continua bloqueado.
4. Comparador prospectivo, repositório de sinais imutáveis, relatórios, CSV protegido, alertas e API autenticada.
5. Integração Android por último, seguida por G01–G21 e liberação comercial com preço e prazo escolhidos pelo proprietário.

## Compatibilidade
Não migrar `licenses.plan_name` para Gold em massa; `gold_access` é independente de `app_access`. Gold pode ficar desligado sem impedir uso ou venda dos outros planos.

## Observações
Não foi feita escrita no Supabase nesta fase e nenhum teste de cobrança real foi realizado. **Backup restaurável do banco ainda não foi comprovado.** O sistema atual não deve depender do estado de Gold.
