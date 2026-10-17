# AeroMind — Publicação de APKs e atualizações

A interface foi implantada somente na **prévia** da Vercel. Nenhum APK foi publicado ainda.

## Páginas
- /minha-conta — cartão Download e atualizações.
- /download — download seguro, novidades e histórico, somente após login e licença ativa.
- /admin#releases — inventário e formulário exclusivo da equipe administradora.

## Como publicar
1. Gere uma versão Android com **versionCode maior** que a anterior e mesmo applicationId.
2. Gere um **APK release assinado**; NÃO publique `app-debug.apk`.
3. Verifique localmente:
   - `apksigner verify --verbose --print-certs app-release.apk`
   - Mesmo SHA-256 do certificado de assinatura usado na distribuição anterior.
   - Confirme pacote, versão, login obrigatório e acesso aos módulos.
4. Entre no painel de administração e abra **Atualizações / Versões do aplicativo**.
5. Selecione o APK, informe versionCode, nome e novidades e marque a confirmação de assinatura.
6. O navegador faz upload diretamente ao bucket privado `aeromind-apk-releases`.
7. O servidor baixa o APK, confere **bytes, tamanho e SHA-256**, checa a estrutura básica e publica o registro por RPC restrita à equipe.
8. A versão anterior é arquivada automaticamente; somente a atual pode ser baixada.
9. Clientes com licença válida recebem URL assinada por 60 segundos. Não existem links públicos permanentes.

## Limites conhecidos e segurança
- O formulário atual de upload aceita até 6 MB. APKs maiores exigem versão com TUS upload resumível.
- Conferência SHA-256 detecta divergências de integridade, mas **não substitui a verificação criptográfica da assinatura do Android**. Confirme o certificado com apksigner antes de publicar.
- Uma URL assinada pode ser compartilhada durante seus 60 segundos de validade; não equivale a DRM perfeito.
- Não divulgue chave de assinatura Android, service_role, segredos ou senhas.
- O download por sessão do site exige autenticação no navegador; não há compartilhamento automático de cookies do Android.
- Nunca sugira desinstalar o app antigo para forçar atualização: a identidade da instalação e dados locais poderiam ser perdidos.
- O backend suporta novas versões; a v0.26.8 do código Android consulta o RPC `aeromind_android_latest_release` quando login/licença estão autorizados e oferece link do site.
- O APK antigo encontrado na pasta do projeto não contém o login obrigatório. **Não enviar para publicação.**

## Testes para liberar produção
- Compilar v0.26.8 no AndroidIDE e verificar o APK final, sem classes antigas.
- Produzir APK release assinado com a chave de distribuição. Avaliar compatibilidade da chave com instalação de debug existente.
- Publicar primeiro em acesso restrito a testers; checar login, dispositivo, instalação sobre versão anterior, manutenção de dados e download renovado.
- Validar acesso de conta sem licença, expirada, revogada e deslogada: devem receber bloqueio.
- Aprovar merge da branch antes de fazer deploy de produção.
