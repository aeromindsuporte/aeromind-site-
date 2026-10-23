-- Menor privilégio para confirmação de leitura: o usuário só altera read_at na própria entrega.
grant update(read_at) on public.aeromind_notification_deliveries to authenticated;
drop policy if exists aeromind_notification_delivery_self_update on public.aeromind_notification_deliveries;
create policy aeromind_notification_delivery_self_update
 on public.aeromind_notification_deliveries
 for update to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid()));
alter function public.aeromind_mark_notification_read(uuid) security invoker;
