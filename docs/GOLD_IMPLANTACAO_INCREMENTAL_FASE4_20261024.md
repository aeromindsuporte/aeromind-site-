# AeroMind Gold — fase 4: comparador sequencial offline (24/10/2026)

## Escopo gravado no GitHub (revisão antes da publicação)
- Nova rota administrativa protegida: `/admin/gold/comparador`.
- Acesso somente a administradores e proprietários autenticados, mediante `requireAdmin()` + conferência de papel.
- Vínculo opcional a um cliente pré-selecionado: busca a versão Gold mais recente somente daquela conta, sem atualizar quaisquer dados.
- Entrada local por CSV ou colagem, máximo 1.500 resultados sequenciais, com colunas `id;data_hora_iso;resultado_x`; valida IDs, datas, ordem, multiplicadores e lacunas.
- Comparação offline walk-forward: cada avaliação do indicador N usa somente resultados já encerrados até N-1; o multiplicador de N serve apenas para conferir retrospectivamente o limiar.
- O resultado "limiar atingido" NÃO equivale a ganho, aposta executada, previsão ao vivo ou validação estatística de vantagem.
- Clássico apresenta apenas o alvo de referência: o filtro original do aplicativo ainda não foi auditado, logo não existe taxa de acerto para o perfil Clássico.
- Refinado e Gold usam o motor de indicadores versionado existente, inclusive continuidade mínima de 50 rodadas, controles de sessão e intervalo de até 300 segundos.
- Resumo de oportunidades, condições atendidas, limiares atingidos, histórico incompleto; tabela rastreável e exportação de decisões CSV no navegador.
- O CSV exportado contém última rodada conhecida e rodada avaliada, perfil, indicador, alvo, estado, multiplicador observado e versão da regra.
- Nova bateria `tests/gold-comparator.test.mjs` vinculada ao `npm run build` para testar integridade, cronologia, não vazamento do resultado posterior e bloqueios.

## O que NÃO foi implantado
- Nenhuma ingestão de resultados reais em tempo real, API de jogos, registro prospectivo imutável ou auditoria de sinais ao vivo.
- Nenhuma tabela nova, migração SQL, escritura no Supabase, upload de CSV ao servidor, alteração em clientes, licenças ou pagamentos.
- Nenhuma oferta de compra, checkout Gold ou ativação de acesso no aplicativo.
- Não há prova de retorno financeiro, acerto futuro ou ganho devido a limiares atingidos retrospectivamente.

## Acesso, privacidade e segurança
- O comparador lê uma configuração Gold personalizada somente se a conta de cliente selecionada for válida e o administrador tiver autorização.
- Se uma consulta falhar, a página bloqueia análise personalizada; não substitui silenciosamente regras de um cliente.
- Os registros importados e exportados ficam no navegador; o conteúdo não é transmitido a uma API nesta fase.
- Ao trocar o conteúdo CSV o administrador precisa confirmar novamente a integridade da sessão.
- Todas as funções Básico/Pro/Ultra, licenças anteriores e Pix continuam preservadas.

## Próxima etapa técnica
1. Verificar build, testes e responsividade na Vercel, incluindo busca e histórico da fase 3.
2. Preparar captura prospectiva real por rodada no backend com ID, horário observado, momento do sinal, integridade e assinatura de versão; guardar sinais de forma imutável antes da rodada seguinte, quando houver fonte legítima e validada.
3. Implementar relatórios de observações reais segregados por usuário, e exportação protegida e auditada.
4. Homologar alertas e integração comercial Gold sem ativar venda.
5. Integrar Android apenas depois de todos os módulos do site e validação ponta a ponta.

**Requisito para publicação:** compilar e testar com uma conta administrativa autorizada. Esta fase não exige migração do banco.
