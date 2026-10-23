-- Consulta enriquecida para a central administrativa: dados restritos à equipe.
create or replace function public.aeromind_admin_device_activity(p_limit integer default 200)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not private.aeromind_verified_staff() then
  raise exception 'Administração necessária' using errcode='42501';
 end if;
 return coalesce((
   select jsonb_agg(jsonb_build_object(
     'id',e.id,
     'user_id',e.user_id,
     'customer_email',coalesce(u.email,''),
     'customer_name',coalesce(p.display_name,''),
     'event_type',e.event_type,
     'device_name',e.device_name,
     'device_id',e.device_id,
     'actor_id',e.actor_id,
     'actor_kind',case when e.actor_id is null then 'sistema'
       when e.actor_id=e.user_id then 'cliente' else 'equipe' end,
     'ticket_id',e.ticket_id,
     'ticket_status',t.status,
     'detail',e.detail,
     'occurred_at',e.occurred_at,
     'reviewed_at',e.reviewed_at
   ) order by e.occurred_at desc,e.id desc)
   from (select * from public.aeromind_device_activity
      order by occurred_at desc,id desc limit greatest(1,least(coalesce(p_limit,200),500))) e
   left join auth.users u on u.id=e.user_id
   left join public.profiles p on p.id=e.user_id
   left join public.aeromind_support_tickets t on t.id=e.ticket_id
 ),'[]'::jsonb);
end;
$$;
revoke all on function public.aeromind_admin_device_activity(integer) from public,anon,authenticated;
grant execute on function public.aeromind_admin_device_activity(integer) to authenticated;