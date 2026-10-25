-- Aurora Pulse: presenca por sessao autenticada e inbox oficial do app.
-- Sem IP, geolocalizacao, dados de apostas ou conteudo do navegador.
create table if not exists public.aeromind_app_presence (
 session_id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 app_version varchar(60) not null,
 first_seen_at timestamptz not null default clock_timestamp(),
 last_seen_at timestamptz not null default clock_timestamp(),
 background_at timestamptz,
 exited_at timestamptz,
 state text not null default 'foreground'
   check(state in ('foreground','background','logout'))
);
create index if not exists aeromind_app_presence_recent_idx
 on public.aeromind_app_presence(last_seen_at desc);
create index if not exists aeromind_app_presence_user_idx
 on public.aeromind_app_presence(user_id,last_seen_at desc);
alter table public.aeromind_app_presence enable row level security;
revoke all on public.aeromind_app_presence from public,anon,authenticated;
grant select on public.aeromind_app_presence to authenticated;
create policy aeromind_presence_self_or_admin on public.aeromind_app_presence
for select to authenticated using (
 user_id=(select auth.uid()) or
 (select private.aeromind_verified_staff())
);
create or replace function public.aeromind_pulse_presence(
 p_session_id uuid, p_event text, p_version text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); current_owner uuid; current_state text;
begin
 if who is null or p_session_id is null
    or p_event is null or p_event not in ('foreground','heartbeat','background','logout')
    or p_version is null or length(btrim(p_version)) not between 2 and 60
 then raise exception 'Sessao invalida' using errcode='22023'; end if;
 if not exists(select 1 from public.licenses
   where user_id=who and status='active' and valid_until>clock_timestamp())
 then raise exception 'Licenca nao ativa' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_session_id::text,8642));
 select user_id,state into current_owner,current_state
 from public.aeromind_app_presence where session_id=p_session_id for update;
 if current_owner is not null and current_owner<>who then
   raise exception 'Sessao de outra conta' using errcode='42501'; end if;
 if current_owner is null then
   if p_event in ('logout','background') then
     return jsonb_build_object('ok',true,'recorded',false);end if;
   insert into public.aeromind_app_presence(session_id,user_id,app_version)
   values(p_session_id,who,btrim(p_version));
 elsif current_state<>'logout' then
   update public.aeromind_app_presence
   set app_version=btrim(p_version),last_seen_at=clock_timestamp(),
    state=case when p_event='heartbeat' then 'foreground' else p_event end,
    background_at=case when p_event='background' then clock_timestamp()
          when p_event='foreground' or p_event='heartbeat' then null
          else background_at end,
    exited_at=case when p_event='logout' then clock_timestamp() else exited_at end
   where session_id=p_session_id and user_id=who;
 end if;
 return jsonb_build_object('ok',true,'recorded',true,'session',p_session_id);
end $$;
revoke all on function public.aeromind_pulse_presence(uuid,text,text) from public,anon,authenticated;
grant execute on function public.aeromind_pulse_presence(uuid,text,text) to authenticated;

create or replace function public.aeromind_pulse_my_admin_notifications()
returns jsonb language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid(); messages jsonb;
begin
 if who is null then raise exception 'Autenticacao necessaria' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(d) order by d.published_at desc),'[]'::jsonb)
 into messages from (
  select d.id,d.title,d.body,d.category,d.published_at,d.read_at
  from public.aeromind_notification_deliveries d
  join public.aeromind_notification_campaigns c on c.id=d.campaign_id
  where d.user_id=who and c.channel_app=true
   and (d.expires_at is null or d.expires_at>clock_timestamp())
  order by d.published_at desc limit 80
 ) d;
 return jsonb_build_object('ok',true,'items',messages);
end $$;
revoke all on function public.aeromind_pulse_my_admin_notifications() from public,anon,authenticated;
grant execute on function public.aeromind_pulse_my_admin_notifications() to authenticated;

create or replace function public.aeromind_admin_pulse_presence()
returns jsonb language plpgsql security definer set search_path='' as $$
declare records jsonb;
begin
 if not private.aeromind_verified_staff()
 then raise exception 'Acesso administrativo necessario' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(q) order by q.last_seen_at desc),'[]'::jsonb)
 into records from (
  select p.session_id,p.user_id,
    coalesce(u.email,'') as email,
    p.app_version,p.first_seen_at,p.last_seen_at,p.background_at,p.exited_at,
    p.state,
    (p.state='foreground' and p.last_seen_at>clock_timestamp()-interval '110 seconds') as online,
    coalesce((select l.plan_name from public.licenses l
      where l.user_id=p.user_id and l.status='active' and l.valid_until>now()
      order by l.valid_until desc limit 1),'Sem licenca ativa') as plan
  from public.aeromind_app_presence p
  join auth.users u on u.id=p.user_id
  order by p.last_seen_at desc limit 250
 ) q;
 return jsonb_build_object('ok',true,'sessions',records);
end $$;
revoke all on function public.aeromind_admin_pulse_presence() from public,anon,authenticated;
grant execute on function public.aeromind_admin_pulse_presence() to authenticated;
