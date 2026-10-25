# AeroMind Aurora Pulse — integração Android e Site

**Data:** 25/10/2026  
**Fonte Android:** `AEROMIND_AURORA_PULSE_FONTE_ANDROIDIDE.zip` (entregue nesta conversa).  
**Versão Android:** `versionCode 48`, `versionName Aurora Pulse`, `applicationId com.aeromind.monitor` preservado.

## Entregas em código Android
- Diálogo NEON Pro ao clicar `AMPLIADO 5` sem permissão: texto/ranks corretos, CTA `/pro`.
- Diálogo NEON Gold ao clicar `EXPANDIDO 7` ou modo Gold sem permissão: ranks, modos experimentais e CTA `/gold`.
- Teaser de sinais futuros mascarados abaixo de `Próximos Sinais`. Nunca transmite minutos reais premium para usuário bloqueado.
- Botão `↻` ao lado do controle do jogo para `WebView.reload()`, sem limpar RoundCatalog; confirmação avisa que jogo pode exigir novo login.
- Sino no topo, com abas Sinais, App e ADM. Sinais e eventos locais conservam até 60 mensagens por categoria; ADM recebe notificações autorizadas pelo servidor e marca como lidas quando abertas.
- Presença online com consentimento explícito no primeiro acesso, controles em menu de privacidade, eventos foreground/heartbeat/background, estado Online calculado em janela de 110s.
- Distribuição/comportamento exibe contagens e porcentagens parciais antes das 50 rodadas, marcadas como amostra parcial.

## Entregas no Site e Supabase
- `/admin/presenca`: sessões com login, última atividade, segundo plano, plano, versão do app e status.
- `/admin/notificacoes`: opção `App Aurora` para comunicados internos, junto com Site. Notificação push remota permanece indisponível.
- Funções SQL `public.aeromind_pulse_presence`, `public.aeromind_admin_pulse_presence`, `public.aeromind_pulse_my_admin_notifications` e `public.aeromind_pulse_mark_admin_notifications_seen`.
- Presença é opcional e desativá-la não revoga licença ou funções do aplicativo. O status online expira sem heartbeat, evitando falsos 'online' após encerramento inesperado.
- Dados armazenados em `public.aeromind_app_presence` com RLS; usuários anônimos não leem as sessões.

## Validação
- Build Vercel produzido sobre commit `1c1e50863ef038cab8c8dc81f914eee89a8e255e`, deployment `dpl_v6EwE1mTpG7JH1Q4jWwU54aqYGNU` = READY.
- 24 testes Java do núcleo Aurora e 19 verificações estáticas Pulse passaram.
- 149 arquivos originais preservados no ZIP; 3 alterados e 2 novos; nada removido.
- Configuração de Radar Rosa V4 original intacta (hash SHA256 `ba075a77cd561638c5adc98bc09bbfbee582ab4e289b5ca3f14f6cb117f95ddc`).
- **NÃO houve compilação Android nem testes com APK assinada**: ambiente atual sem Android SDK/Gradle e sem chave comercial original. O ZIP é fonte, não APK.
- **Os dois motores Gold 10x continuam sem execução operacional de apostas ou sinais certificados.** Esta atualização melhora a interface, a administração, a distribuição e o inbox, mas não homologa apostabilidade.
- A transmissão colaborativa de logs de todas as rodadas à Central de Estudos continua uma etapa distinta pendente (precisa consentimento e coleta robusta).
- Gold rollout e checkout permanecem desativados deliberadamente; nenhum preço de Pro foi alterado.

## Aceite após compilar no AndroidIDE
1. Instalar com a mesma assinatura da versão anterior (se for release comercial).
2. Básico seleciona AMPLIADO: ver diálogo Pro, não Gold; EXPANDIDO: diálogo Gold.
3. Contar botões em telas estreitas; conferir sino, recarga manual do jogo e painel depois de 21/50 rodadas.
4. Aprovar/rejeitar presença; verificar alteração no ADM e perda de status online após ausência de heartbeat.
5. ADM marca canal App Aurora e envia uma mensagem; abrir o sino do app com conta destinatária e confirmar leitura.
6. Validar funcionalidades básicas antigas e modos Pro/Gold conforme autorização.
