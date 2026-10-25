-- AeroMind Android support chat: authenticated RPCs returning objects, never exposing other clients.
create or replace function public.aeromind_support_chat_my_inbox()
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null then raise exception 'Autenticação necessária' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.updated_at desc),'[]'::jsonb)
 into result from (
  select t.id,t.subject,t.status,t.updated_at,
   (select count(*)::int from public.aeromind_support_messages m
     where m.ticket_id=t.id and m.author_id<>actor
     and (t.customer_seen_at is null or m.created_at>t.customer_seen_at)) as unread
  from public.aeromind_support_tickets t
  where t.user_id=actor order by t.updated_at desc limit 30
 ) q;
 return jsonb_build_object('ok',true,'tickets',result);
end $$;
create or replace function public.aeromind_support_chat_my_messages(p_ticket_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null or p_ticket_id is null or not exists (
  select 1 from public.aeromind_support_tickets t
  where t.id=p_ticket_id and t.user_id=actor
 ) then raise exception 'Conversa não encontrada' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at,q.id),'[]'::jsonb)
 into result from (
  select m.id,m.content,m.author_id,m.created_at
  from public.aeromind_support_messages m
  where m.ticket_id=p_ticket_id order by m.created_at desc,m.id desc limit 200
 ) q;
 return jsonb_build_object('ok',true,'items',result,'my_user_id',actor);
end $$;
create or replace function public.aeromind_support_chat_mobile_seen(p_ticket_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare done boolean;
begin
 done:=public.aeromind_support_chat_seen(p_ticket_id);
 return jsonb_build_object('ok',done);
end $$;
revoke all on function public.aeromind_support_chat_my_inbox() from public,anon,authenticated;
revoke all on function public.aeromind_support_chat_my_messages(uuid) from public,anon,authenticated;
revoke all on function public.aeromind_support_chat_mobile_seen(uuid) from public,anon,authenticated;
grant execute on function public.aeromind_support_chat_my_inbox() to authenticated;
grant execute on function public.aeromind_support_chat_my_messages(uuid) to authenticated;
grant execute on function public.aeromind_support_chat_mobile_seen(uuid) to authenticated;
