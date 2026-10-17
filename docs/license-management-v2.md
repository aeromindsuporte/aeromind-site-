# AeroMind — Gestão segura de licenças V2

## Situação
O banco está preparado; **nenhuma licença ou cobrança é criada automaticamente**.
A versão pública continua sem mudanças. Implementação em branch feature/login-supabase-v1.

## Controle do cliente
- Login exigido em /minha-conta e /download
- Autorização `aeromind_has_active_license` executada no servidor
- Licença ativa exige status=active E valid_until futuro
- APK desativado até possuir arquivo assinado e política de vínculo de dispositivo
- Registro e histórico das licenças visíveis só pelo próprio usuário

## Administração
- Tabela `aeromind_staff`: somente a conta proprietária com e-mail confirmado recebeu o papel owner.
- Função pública invoker `aeromind_manage_license`, que delega para função definer no schema privado. A função privada verifica `auth.uid()` contra a tabela staff e e-mail confirmado.
- Parâmetros: `p_customer_email`, `p_plan_name` (Básico, Pro, Ultra), `p_status`, `p_valid_until`, `p_note`.
- Status active EXIGE vencimento no futuro. Não se cria licença na inscrição.
- Histórico em `license_audit`, visível apenas aos administradores.
- A interface administrativa será desenhada e aprovada antes da implementação, conforme o processo de design do projeto.

## A fazer antes de vender
- Visual do painel admin aprovado e integrado às funções
- Fluxo real de pagamento com webhook verificável, idempotência e faturamento
- APK assinado e verificação de licença NO APP, não só no site
- Teste com usuários de contas distintas, alteração de estado, RLS e auditoria
- SMTP transacional/domínio verificado e revisão dos documentos comerciais
