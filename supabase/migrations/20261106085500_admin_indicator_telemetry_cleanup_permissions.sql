-- Permite que a RPC SECURITY INVOKER faça limpeza somente como ADM autenticado.
grant delete on public.aeromind_indicator_telemetry to authenticated;
grant delete on public.aeromind_indicator_daily to authenticated;
create policy aeromind_indicator_owner_delete on public.aeromind_indicator_telemetry
  for delete to authenticated
  using (owner_id = (select auth.uid()) and owner_id='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid);
create policy aeromind_indicator_daily_delete on public.aeromind_indicator_daily
  for delete to authenticated
  using (owner_id = (select auth.uid()) and owner_id='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid);
