-- AeroMind Support Chat V2 — keeps existing tickets and messages intact.
-- All writes run inside authorized RPCs; no service key in client code.
alter table public.aeromind_support_tickets
 add column if not exists staff_seen_at timestamptz,
 add column if not exists customer_seen_at timestamptz,
 add column if not exists last_customer_at timestamptz,
 add column if not exists last_staff_at timestamptz;

create index if not exists aeromind_support_chat_ticket_updated
 on public.aeromind_support_tickets(updated_at desc);

create or replace function private.aeromind_support_message_bumped()
returns trigger language plpgsql security definer set search_path='' as $$
declare owner_id uuid;
begin
 select user_id into owner_id from public.aeromind_support_tickets
 where id=new.ticket_id;
 update public.aeromind_support_tickets set
 updated_at=clock_timestamp(),
 last_customer_at=case when new.author_id=owner_id then clock_timestamp() else last_customer_at end,
 last_staff_at=case when new.author_id<>owner_id then clock_timestamp() else last_staff_at end
 where id=new.ticket_id;
 return new;
end $$;
drop trigger if exists support_chat_message_activity on public.aeromind_support_messages;
create trigger support_chat_message_activity after insert on public.aeromind_support_messages
for each row execute function private.aeromind_support_message_bumped();

create or replace function public.aeromind_support_chat_send(
 p_ticket_id uuid,p_message text,p_subject text default 'Atendimento AeroMind'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); is_staff boolean; owner_id uuid; state text;
 t uuid; message_id uuid; recent integer;
begin
 if actor is null then raise exception 'Faça login para conversar' using errcode='42501';end if;
 if p_message is null or length(btrim(p_message)) not between 2 and 3000
 then raise exception 'Mensagem entre 2 e 3000 caracteres' using errcode='22023';end if;
 is_staff:=private.aeromind_verified_staff();
 if not is_staff then
   select count(*) into recent from public.aeromind_support_messages
   where author_id=actor and created_at>clock_timestamp()-interval '10 minutes';
   if recent>=24 then raise exception 'Aguarde antes de enviar novas mensagens' using errcode='22023';end if;
 end if;
 if p_ticket_id is null then
  if is_staff then raise exception 'Escolha uma conversa de cliente' using errcode='22023';end if;
  if length(btrim(coalesce(p_subject,''))) not between 5 and 140
  then raise exception 'Assunto inválido' using errcode='22023';end if;
  insert into public.aeromind_support_tickets(user_id,subject,category,status)
  values(actor,btrim(p_subject),'geral','open') returning id into t;
 else
  select user_id,status into owner_id,state from public.aeromind_support_tickets where id=p_ticket_id for update;
  if not found or (not is_staff and owner_id<>actor) then
   raise exception 'Conversa não encontrada' using errcode='42501';end if;
  if state='resolved' and not is_staff then
    raise exception 'Conversa encerrada; inicie outra' using errcode='22023';end if;
  t:=p_ticket_id;
 end if;
 insert into public.aeromind_support_messages(ticket_id,author_id,content)
 values(t,actor,btrim(p_message)) returning id into message_id;
 if is_staff then
  update public.aeromind_support_tickets set status='in_progress',staff_seen_at=clock_timestamp() where id=t;
 else
  update public.aeromind_support_tickets set
    customer_seen_at=clock_timestamp(),status='open' where id=t and status<>'resolved';
 end if;
 return jsonb_build_object('ok',true,'ticket_id',t,'message_id',message_id);
end $$;

create or replace function public.aeromind_support_chat_seen(p_ticket_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); is_staff boolean;
begin
 if actor is null or p_ticket_id is null then return false;end if;
 is_staff:=private.aeromind_verified_staff();
 if is_staff then
  update public.aeromind_support_tickets set staff_seen_at=clock_timestamp() where id=p_ticket_id;
 else
  update public.aeromind_support_tickets set customer_seen_at=clock_timestamp()
  where id=p_ticket_id and user_id=actor;
 end if;
 return found;
end $$;

create or replace function public.aeromind_support_chat_set_status(p_ticket_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not private.aeromind_verified_staff() then
 raise exception 'Somente administração' using errcode='42501';end if;
 if p_ticket_id is null or p_status not in ('open','in_progress','resolved')
 then raise exception 'Situação inválida' using errcode='22023';end if;
 update public.aeromind_support_tickets
 set status=p_status,updated_at=clock_timestamp() where id=p_ticket_id;
 return found;
end $$;

create or replace function public.aeromind_support_chat_admin_inbox()
returns jsonb language plpgsql security definer set search_path='' as $$
declare records jsonb;
begin
 if not private.aeromind_verified_staff() then
 raise exception 'Somente administração' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(s) order by s.updated_at desc),'[]'::jsonb) into records
 from (
  select t.id,t.user_id,coalesce(nullif(p.display_name,''),u.email,'Cliente') as client,
   t.subject,t.status,t.updated_at,t.created_at,
   (select m.content from public.aeromind_support_messages m
      where m.ticket_id=t.id order by m.created_at desc,m.id desc limit 1) as preview,
   (select count(*)::int from public.aeromind_support_messages m
      where m.ticket_id=t.id and m.author_id=t.user_id
      and (t.staff_seen_at is null or m.created_at>t.staff_seen_at)) as unread
  from public.aeromind_support_tickets t
  join auth.users u on u.id=t.user_id
  left join public.profiles p on p.id=t.user_id
  order by t.updated_at desc limit 200
 ) s;
 return jsonb_build_object('ok',true,'items',records);
end $$;

create or replace function public.aeromind_support_chat_unread_count()
returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); total integer;
begin
 if actor is null then return 0;end if;
 if private.aeromind_verified_staff() then
  select count(*)::int into total from public.aeromind_support_messages m
  join public.aeromind_support_tickets t on t.id=m.ticket_id
  where m.author_id=t.user_id
    and (t.staff_seen_at is null or m.created_at>t.staff_seen_at);
 else
  select count(*)::int into total from public.aeromind_support_messages m
  join public.aeromind_support_tickets t on t.id=m.ticket_id
  where t.user_id=actor and m.author_id<>actor
    and (t.customer_seen_at is null or m.created_at>t.customer_seen_at);
 end if;
 return least(coalesce(total,0),999);
end $$;

-- Restrict privilege on legacy tables; preserve SELECT via RLS and read-only ticket listing.
revoke all on public.aeromind_support_tickets from anon,authenticated;
revoke all on public.aeromind_support_messages from anon,authenticated;
grant select on public.aeromind_support_tickets to authenticated;
grant select on public.aeromind_support_messages to authenticated;
revoke all on function public.aeromind_support_chat_send(uuid,text,text) from public,anon,authenticated;
revoke all on function public.aeromind_support_chat_seen(uuid) from public,anon,authenticated;
revoke all on function public.aeromind_support_chat_set_status(uuid,text) from public,anon,authenticated;
revoke all on function public.aeromind_support_chat_admin_inbox() from public,anon,authenticated;
revoke all on function public.aeromind_support_chat_unread_count() from public,anon,authenticated;
grant execute on function public.aeromind_support_chat_send(uuid,text,text) to authenticated;
grant execute on function public.aeromind_support_chat_seen(uuid) to authenticated;
grant execute on function public.aeromind_support_chat_set_status(uuid,text) to authenticated;
grant execute on function public.aeromind_support_chat_admin_inbox() to authenticated;
grant execute on function public.aeromind_support_chat_unread_count() to authenticated;
