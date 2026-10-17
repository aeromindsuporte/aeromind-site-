# Painel administrativo AeroMind — V1

## Dados e acesso
- Rota `/admin` protegida com Supabase Auth e `aeromind_staff`.
- Somente usuário administrador validado entra; demais usuários retornam para /minha-conta.
- Leitura via RPC `aeromind_admin_overview` com autorização interna por `auth.uid()` e limite de 100 clientes e 100 licenças recentes.
- Sem números inventados, receita marcada indisponível até pagamentos ativos.

## Licenças
- Formulário de atualização exige cliente previamente confirmado.
- Permite Básico / Pro / Ultra e estados Pendente, Ativa, Suspensa, Expirada e Revogada.
- Ativa exige validade futura. Cada ação é auditada em `license_audit`.
- Clientes nunca têm acesso de escrita à tabela de licenças; RPC exige staff confirmado.

## Planos
- Catálogo interno inicial com 12 combinações (3 categorias x 4 durações), preço inicial vazio e exibição desativada.
- Salvar preço/visibilidade não habilita checkout nem concessão de acesso.
- Convites, cupons, pagamentos e APK continuam indisponíveis.

## Antes de produção
- Validar funcionalidade e aparência no preview (desktop/mobile).
- Testar com conta owner e outra conta sem papel staff.
- Testar criação, suspensão, renovação e revogação de uma licença de teste, sem ativar compras reais.
- Confirmar envio de e-mail comercial por SMTP transacional/domínio quando necessário.
- Aprovar liberação do painel para produção separadamente do visual.
