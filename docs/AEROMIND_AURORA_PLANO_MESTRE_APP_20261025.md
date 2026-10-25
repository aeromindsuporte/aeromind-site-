# AeroMind Aurora — Plano-mestre da próxima atualização Android

**Registrado em:** 25/10/2026  
**Situação:** decisões de planejamento preservadas para execução após recebimento e auditoria do ZIP-fonte do aplicativo Android.  
**Referências:** prints reais do Monitor 0.27.2 comercial, prévias de Básico × Gold e mensagens da conversa de planejamento.  
**Nome comercial:** **AeroMind Aurora**. Manter `versionCode` e `versionName` técnicos coerentes com a instalação/atualização Android, sem apresentar numeração técnica como identidade comercial.

> **Regra geral:** preservar o aplicativo e todas as funções já existentes. Implementar de forma aditiva, reproduzível, responsiva e fiel às capturas reais. Recursos Gold novos permanecem em teste e controle de licença; não publicar promessas de lucros ou sinais garantidos.

## 1. Três planos comerciais — Radar Rosa V4

| Plano | Seleção comercial | Janelas horárias do Radar V4 | Acesso |
| --- | --- | --- | --- |
| **Básico** | **CORE** | ranks **1–3** | recursos essenciais e radar CORE |
| **Pro** | **AMPLIADO** | ranks **1–5** (CORE + ranks 4–5) | tudo do Básico + faixas ampliadas |
| **Gold** | **EXPANDIDO 7** | ranks **1–7** (CORE + ranks 4–5 + ranks 6–7) | tudo do Pro + máxima cobertura |

**Detalhe importante:** a base histórica do Radar V4 descreve os ranks 1–3 como CORE, 4–5 como AMPLIADA e 6–7 como RESERVA; todos os sete eram ativos na configuração técnica original. A proposta comercial sobrepõe *limites máximos de acesso* sobre essas janelas sem inventar novos minutos ou parâmetros. Pro e Gold herdam as janelas de planos anteriores. Core não bloqueia a execução das janelas adicionais liberadas.

- Fonte dos minutos e parâmetros: **JSON original `AEROMIND_ROSA_PREVISAO_V4_EXPANDIDA_24H.json`**; 7 janelas por hora, 24 horas, até 168 eventos possíveis por dia. Não inventar minutos e não substituir por minuto fixo.
- A distribuição real dos sinais depende dos parâmetros históricos, integridade da coleta e filtros, não de promessa de precisão; **menos sinais não significa necessariamente maior qualidade comprovada**.
- **Compatibilidade:** não reduzir silenciosamente o acesso de licenças e clientes atuais, inclusive licenças legadas; conferir o significado de CORE/AMPLIADO/EXPANDIDO em cada módulo antes de migrar permissões. O proprietário poderá definir as regras de transição.
- Limites de plano e gates devem vir do servidor, não apenas dos botões da interface. Nome comercial **Gold** substitui **Ultra** onde já aprovado, sem invalidar IDs internos ou licenças.

## 2. Experiência comercial Básico, Pro e Gold

### Básico — Gold aparece, mas está bloqueado
- Manter indicadores BAIXA, MEDIANA, ALTA, ALTO RISCO atual, histórico, Radar CORE e estratégias atuais contratadas.
- Exibir cartão **👑 AEROMIND GOLD** abaixo da área relevante, com recursos premium visíveis como **prévia**, porém com cadeados e texto curto:
  - Gold Rosa 10x — 2 Rodadas;
  - Gold Rosa 10x — 8 Rodadas;
  - placar de tentativas separado;
  - análises/configurações profissionais;
  - cobertura EXPANDIDO 7.
- Botões comerciais **Conhecer o Gold** e/ou **Visualizar proposta Básico × Gold**, levando à página do plano no site. Não fingir desbloqueio ou venda ativa enquanto o site mantiver checkout Gold desligado.
- Garantir que cartão e CTA não ocupem espaço excessivo em celular e não bloqueiem a função básica.

### Pro — intermediário
- Herdar recursos do Básico + Radar AMPLIADO, sinalizar recursos Gold disponíveis apenas como prévia com indicação clara do plano necessário. Não anunciar Gold ativo para usuário Pro.
- O Pro também deve enxergar diferença de valor e caminho para o Gold.

### Gold — aparência profissional
- Identificação visível **Gold ativo** quando licença efetivamente validada; cores e detalhes dourados/magenta, sem reformular ou quebrar o estilo escuro/neon do app atual.
- Central Gold, seleção dos modos premium, análise contextual, placares independentes, indicadores de integridade da coleta e controles profissionais.
- Layout coerente com o design da comparação Básico × Gold aprovado como referência de estilo — **não copiar métricas fictícias** dos mockups nem inventar acertos.
- Ausência/revogação/vencimento de licença: telas e dados continuam íntegros; acesso premium bloqueado de verdade pelo servidor e pela aplicação.

## 3. ALTO RISCO — três modos, sem substituição

1. **Atual**: preservar integralmente o comportamento original e seu histórico.
2. **Gold Rosa 10x — 2 Rodadas**: modalidade exclusiva Gold; referências de ranks **4–5** e **até duas tentativas** por evento; depender das verificações de integridade e das regras estudadas no núcleo Android, com testes contra uso de dados futuros.
3. **Gold Rosa 10x — 8 Rodadas**: modalidade Gold **experimental**, ranks **1–7**, alvo fixo 10x, até oito tentativas de observação/avaliação por evento, sem sobreposição de janelas e sem progressão automática de apostas.

- Separar absolutamente contadores e históricos: modo Atual, Gold 2R, Gold 8R; não somar ou reclassificar W/L de um modo para outro.
- Exibir tentativas, pendências, motivos de invalidação, gaps, situação do feed, eventos resolvidos e, quando aplicável, **resultado simulado** com banca virtual separada. Não automatizar apostas reais.
- Pré-condições previstas nos estudos: cinco rosas anteriores no mesmo horário/minuto configurado, **50 rodadas confirmadas continuamente** e dados disponíveis antes da rodada analisada; revisar regras exatas com código-fonte e arquivos V4 ao integrar.
- Estudo histórico de julho/2025 da configuração 10x/8: lucro simulado registrado de **R$ 3.020 no mês completo**, porém simulação iniciada em 16/07 perdeu **R$ 1.000** e houve queda histórica relevante. Estes números não são garantias, não se aplicam automaticamente a outro conjunto de filtros/ranks e não devem aparecer como desempenho ao vivo no app.
- Se não houver prova de elegibilidade temporal ou sequência íntegra da rodada, apresentar **observação histórica / dados insuficientes**, não sinal apostável.

## 4. Interface fiel à última APK

Capturas fornecidas mostram:
- topo **AEROMIND**, contadores, licença, 4 cartões de indicadores, radar em destaque;
- relógio, última rosa e status de coleta;
- jogo Aviator, histórico exato 7×25, Ranking Rosa, Força Rosa, controles de grade;
- painéis Radar Rosa 24H (CORE/AMPLIADO/EXPANDIDO), Distribuição e Rosa Analytics;
- menus de tamanho de tela, ajuda e configurações.

**Correção obrigatória:** botão superior de alteração do tamanho/zoom da tela do jogo está estreito e corta a legenda interna. Implementar largura e layout responsivos, texto legível (ex.: `TELA 85%` ou `TELA 100%`), ícone e indicação do tamanho. Preservar os botões vizinhos e a usabilidade no celular. Evitar sobreposições e rolagem horizontal da página.

Preservar fidelidade da aparência, componentes, comportamento e dados atuais; design só será considerado aprovado/implementado se reproduzível no projeto Android.

## 5. Melhorias anteriores a conservar no escopo

- Corrigir definitivamente a área **ALTO RISCO** que apresentava `DADOS_INSUFICIENTES`/W0L0 incorretamente; auditar antes de alterar cálculo e placar.
- Tela de licença expirada mais clara e comercial, com link ao site para renovação (sem bloquear funcionalidades de licenças válidas).
- No login: botão de mostrar/ocultar senha digitada.
- Possibilidade de **exportar log** operacional com Win/Loss dos indicadores e capturas relevantes.
- Banca **simulada** visível, resultados virtuais e lucro/prejuízo simulado registrado por estratégia; permitir estudos BAIXA + MEDIANA e MEDIANA + ALTA usando a faixa inferior como proteção e superior como objetivo, sem misturar com dinheiro real.
- Registro de erros de conexão, sessão confirmada, eventos perdidos/invalidáveis e versão de regra aplicada ao sinal.
- Central de Estudos e compartilhamento de logs **opt-in**, distinguindo explicitamente voluntário/privado e dados anonimizados. Não carregar dados pessoais desnecessários.

## 6. Segurança e integração com o site

- O site AeroMind já dispõe de módulos administrativos Gold (autorização, configurações versionadas, comparador, laboratório manual, relatórios e prévia de alertas). Esses módulos **ainda não possuem feed externo verificado nem checkout Gold ativo**.
- Integração Android futura deve usar autenticação e entitlement seguro do Supabase/site, sem abrir diretamente tabelas privadas ou confiar em flags locais de Gold.
- Não ativar feed externo ou envio real de alertas sem fonte autorizada e validação de cronologia; manter laboratório manual e resultados reais identificados separadamente.
- Manter básicos e demais planos funcionando durante implantação; backup/restauração testada antes de qualquer operação destrutiva.
- **Sequência aprovada para esta rodada:** atualizar **APP PRIMEIRO** a partir do ZIP-fonte, depois finalizar integrações e pendências do **SITE**. Evitar retrabalho e restauração desnecessária.

## 7. Checklist assim que chegar o ZIP do app

1. Descompactar ZIP, inspecionar Gradle, Kotlin/Java, WebView, HTML/CSS/JS, assets, assinatura, IDs, permissões e versão de base; comparar com prints reais.
2. Verificar compatibilidade de atualização instalável: `applicationId`, `versionCode` crescente, chave de assinatura (sem compartilhar credenciais desnecessárias). Se assinatura não estiver disponível, não alegar que APK instalará como atualização.
3. Inventariar funções antigas e registrar testes de regressão antes de mudanças.
4. Integrar catálogo de permissões Básico/CORE, Pro/AMPLIADO, Gold/EXPANDIDO 7, sem reduzir permissões legadas por engano; testar expiração/revogação.
5. Implementar bloco Gold visível/bloqueado (Básico e Pro) e desbloqueado para Gold ativo.
6. Adicionar seletor ALTO RISCO Atual/Gold 2R/Gold 8R; motores separados, avaliação temporal, placares independentes e indicadores de risco/simulação.
7. Corrigir botão de tamanho da tela do jogo e o layout nos breakpoints reais.
8. Corrigir Alto Risco, revisar exportação de logs, banca simulada, login com revelar senha, licença expirada e Central de Estudos opt-in.
9. Executar testes por perfil/feature, rotas, regras e integridade; compilar APK/AAB quando houver toolchain, fonte completa e assinatura apropriada.
10. Só então avançar para site e homologação de integração, preservando tudo que está operante.

## 8. Critérios de aceite

- Nenhuma função que exista na APK anterior é retirada inadvertidamente.
- CORE 1–3, AMPLIADO 1–5 e EXPANDIDO 1–7 usam a tabela de minutos oficial V4, sem sinais inventados.
- Um usuário Básico/Pro reconhece claramente que Gold existe, porém não acessa recursos Gold; Gold válido os acessa.
- Alternância do Alto Risco não contamina dados de outras modalidades.
- Botão de tela do jogo mostra claramente porcentagem/tamanho no smartphone.
- Telas sem texto cortado nem cartões desproporcionais em resolução de celular.
- Nenhum resultado histórico aparece falsamente como resultado prospectivo, ao vivo ou lucro garantido.
- Plano de rollback e compatibilidade com APK anterior documentados.

### Estado deste documento
**PLANEJADO E REGISTRADO, AINDA NÃO INTEGRADO NA APK.**  
Nome comercial **AeroMind Aurora**. Aguarda ZIP completo do aplicativo Android para execução e validação. Prints e conceitos preservados como referências; valores ilustrativos das imagens não devem ser codificados como dados reais.
