-- Aurora Pulse: marcar somente comunicados App do proprio usuario como lidos.
create or replace function public.aeromind_pulse_mark_admin_notifications_seen()
returns jsonb language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); n integer;
begin
 if who is null then raise exception 'Autenticacao necessaria' using errcode='42501';end if;
 update public.aeromind_notification_deliveries d set read_at=clock_timestamp()
 from public.aeromind_notification_campaigns c
 where c.id=d.campaign_id and c.channel_app=true
   and d.user_id=who and d.read_at is null
   and (d.expires_at is null or d.expires_at>clock_timestamp());
 get diagnostics n=row_count;
 return jsonb_build_object('ok',true,'marked',n);
end $$;
revoke all on function public.aeromind_pulse_mark_admin_notifications_seen() from public,anon,authenticated;
grant execute on function public.aeromind_pulse_mark_admin_notifications_seen() to authenticated;
