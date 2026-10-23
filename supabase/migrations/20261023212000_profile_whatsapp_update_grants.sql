-- Corrige erro de salvamento de WhatsApp em Minha Conta.
-- A RLS profiles_update_self já restringe atualizações ao próprio usuário;
-- faltava GRANT UPDATE às quatro colunas editáveis pelo formulário.
-- Não conceder UPDATE amplo em profiles (id/display_name permanecem protegidos).
grant update (
  whatsapp_e164,
  whatsapp_marketing_opt_in,
  whatsapp_opt_in_at,
  updated_at
) on table public.profiles to authenticated;
