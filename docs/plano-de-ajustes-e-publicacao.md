# AeroMind — Lista de ajustes até a publicação

Regra: e-mail transacional/SMTP será implementado por último, conforme decisão de outubro de 2026.
Designs novos precisam de aprovação antes de alterar interfaces. Mudanças testadas primeiro na ramificação de prévia, com deploys agrupados.

## Concluído
- [x] Landing neon V2 e layout responsivo existente
- [x] Login, cadastro e confirmação de e-mail de teste
- [x] Conta do cliente e consultas de licenças com RLS
- [x] Painel administrativo restrito a conta verificada
- [x] Ativação, suspensão, revogação, validade e histórico de licenças; testes reversíveis sem registros fictícios
- [x] Catálogo de 12 modalidades, sem preços presumidos
- [x] Integração de preços: exibir apenas planos marcados visíveis e com preço > zero
- [x] Navegação mensal/anual redireciona para /planos
- [x] Sem checkout e sem download ativo enquanto estiverem em desenvolvimento

## Próximos ajustes técnicos (sem SMTP por enquanto)
- [ ] Verificação mobile detalhada: overflow dos cards, botões e menus, telas menores
- [ ] Trocar sprite comprimido de capturas reais por imagens aprovadas de alta resolução
- [ ] Processo de gestão de dispositivos e vínculo de licença ao aplicativo Android — primeiro aprovar design da tela
- [ ] Assinatura e entrega segura do APK por licença, sem permitir acesso somente por botão frontend
- [ ] Conectar pagamento real somente após seleção de provedor e homologação da operação
- [ ] Definir e aprovar preços e regras de renovação/cancelamento, evitar dados fictícios
- [ ] Formalizar textos legais (LGPD/termos/privacidade/reembolso) com revisão profissional

## Última fase: e-mail
- [ ] Domínio/remetente SMTP e configuração do serviço transacional
- [ ] Template português AeroMind e fluxo de recuperação entre navegadores
- [ ] Teste completo de confirmação, recuperação, taxa de envio e falhas

## Política de publicação
- Continuar na branch feature/login-supabase-v1 e no PR #1 até homologação.
- Nenhuma fusão automática ou novo deploy de produção sem aprovação.
- Uma atualização consolidada após validação dos principais fluxos.
