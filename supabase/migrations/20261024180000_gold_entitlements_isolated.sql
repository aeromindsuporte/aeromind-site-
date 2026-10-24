-- AeroMind GOLD phase 2: additive / independent of Basic, Pro, Ultra and Pix.
-- Disabled by default: no Gold entitlement is activated in Android or checkout.
create schema if not exists private;

create table if not exists private.aeromind_gold_rollout (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 checkout_enabled boolean not null default false,
 updated_at timestamptz not null default now()
);
insert into private.aeromind_gold_rollout(singleton,enabled,checkout_enabled)
values(true,false,false) on conflict (singleton) do nothing;
revoke all on private.aeromind_gold_rollout from public, anon, authenticated;
alter table private.aeromind_gold_rollout enable row level security;

create table if not exists public.aeromind_gold_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 valid_until timestamptz,
 reason text not null default 'Aguardando autorização Gold',
 updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint aeromind_gold_access_valid_until check (not enabled or valid_until is not null),
 constraint aeromind_gold_access_reason check (char_length(reason) between 8 and 500)
);
create index if not exists aeromind_gold_access_updated_idx on public.aeromind_gold_access(updated_at desc);
alter table public.aeromind_gold_access enable row level security;
revoke all on public.aeromind_gold_access from public, anon, authenticated;
grant select on public.aeromind_gold_access to authenticated;
create policy gold_access_self_or_staff on public.aeromind_gold_access
for select to authenticated using (
  user_id=(select auth.uid()) or exists(
    select 1 from public.aeromind_staff s where s.user_id=(select auth.uid()) and s.role in ('admin','owner')
  )
);

create or replace function private.aeromind_gold_valid_settings(p jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare
 k text;
 item jsonb;
 filter_obj jsonb;
 mode text;
begin
 if p is null or jsonb_typeof(p)<>'object' then return false; end if;
 if (select count(*) from jsonb_object_keys(p))<>3 or not (p ? 'BAIXA' and p ? 'MEDIANA' and p ? 'ALTA') then return false; end if;
 foreach k in array array['BAIXA','MEDIANA','ALTA'] loop
  item:=p->k;
  if jsonb_typeof(item)<>'object' or
      (select count(*) from jsonb_object_keys(item))<>2 or
      not(item ? 'target' and item ? 'filter') then return false; end if;
  if case k
       when 'BAIXA' then (item->>'target') not in ('low35','column7_5_p25')
       when 'MEDIANA' then (item->>'target') not in ('column7_5_p50')
       else (item->>'target') not in ('column7_5_p75','column7_6_p75','column7_7_p75')
     end then return false; end if;
  filter_obj:=item->'filter';
  if jsonb_typeof(filter_obj)<>'object' then return false; end if;
  mode:=filter_obj->>'mode';
  if mode='continuous' then
    if (select count(*) from jsonb_object_keys(filter_obj))<>1 then return false;end if;
  elsif mode='purple_count' then
    if (select count(*) from jsonb_object_keys(filter_obj))<>2 or
       coalesce(filter_obj->>'k','') not in ('5','6','7') or
       jsonb_typeof(filter_obj->'k')<>'number' then return false;end if;
  elsif mode='purple_improving' then
    if (select count(*) from jsonb_object_keys(filter_obj))<>2 or
       coalesce(filter_obj->>'k','') not in ('4','5','6') or
       jsonb_typeof(filter_obj->'k')<>'number' then return false;end if;
  elsif mode='paying_counts' then
    if (select count(*) from jsonb_object_keys(filter_obj))<>3 or
       coalesce(filter_obj->>'a','') not in ('8','9','10') or
       coalesce(filter_obj->>'b','') not in ('2','3','4') or
       jsonb_typeof(filter_obj->'a')<>'number' or
       jsonb_typeof(filter_obj->'b')<>'number' then return false;end if;
  else
    return false;
  end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function private.aeromind_gold_valid_settings(jsonb) from public, anon, authenticated;

create table if not exists public.aeromind_gold_config_versions (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 version integer not null check(version>=1),
 settings jsonb not null,
 changed_by uuid references auth.users(id) on delete set null,
 reason text not null check(char_length(reason) between 8 and 500),
 created_at timestamptz not null default now(),
 constraint gold_settings_catalog_check check(private.aeromind_gold_valid_settings(settings)),
 constraint gold_config_unique_version unique(user_id,version)
);
create index if not exists gold_config_latest_idx on public.aeromind_gold_config_versions(user_id,version desc);
alter table public.aeromind_gold_config_versions enable row level security;
revoke all on public.aeromind_gold_config_versions from public, anon, authenticated;
grant select on public.aeromind_gold_config_versions to authenticated;
create policy gold_config_read on public.aeromind_gold_config_versions
for select to authenticated using (
 user_id=(select auth.uid()) or exists (
 select 1 from public.aeromind_staff s where s.user_id=(select auth.uid()) and s.role in ('admin','owner')
 )
);

create table if not exists public.aeromind_gold_audit (
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('access_granted','access_revoked','config_saved')),
 old_value jsonb,
 new_value jsonb,
 reason text not null check(char_length(reason) between 8 and 500),
 created_at timestamptz not null default now()
);
create index if not exists gold_audit_user_time_idx on public.aeromind_gold_audit(user_id,created_at desc);
alter table public.aeromind_gold_audit enable row level security;
revoke all on public.aeromind_gold_audit from public, anon, authenticated;
grant select on public.aeromind_gold_audit to authenticated;
create policy gold_audit_staff_only on public.aeromind_gold_audit
for select to authenticated using (
 exists(select 1 from public.aeromind_staff s where s.user_id=(select auth.uid()) and s.role in ('admin','owner'))
);

-- Public RPCs are narrow endpoints: authenticated users only; they re-check staff server-side.
create or replace function public.aeromind_gold_admin_set_access(
 p_email text,p_enabled boolean,p_valid_until timestamptz,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target_user uuid; previous jsonb; next_access jsonb; reason_text text:=btrim(coalesce(p_reason,''));
begin
 if actor is null or not exists(select 1 from public.aeromind_staff where user_id=actor and role in ('admin','owner'))
 then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 if p_enabled is null or char_length(reason_text) not between 8 and 500
 then raise exception 'Confirme estado e motivo (8 a 500 caracteres)' using errcode='22023';end if;
 if p_enabled and (p_valid_until is null or p_valid_until<=now() or p_valid_until>now()+interval '5 years')
 then raise exception 'Validade Gold inválida' using errcode='22023';end if;
 if p_email is null or char_length(btrim(p_email))>320 then raise exception 'E-mail inválido' using errcode='22023';end if;
 select u.id into target_user from auth.users u where lower(u.email)=lower(btrim(p_email)) limit 1;
 if target_user is null then raise exception 'Cliente não encontrado' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(target_user::text,99237));
 select to_jsonb(a) into previous from public.aeromind_gold_access a where a.user_id=target_user;
 insert into public.aeromind_gold_access(user_id,enabled,valid_until,reason,updated_by)
 values(target_user,p_enabled,case when p_enabled then p_valid_until else null end,reason_text,actor)
 on conflict(user_id) do update
 set enabled=excluded.enabled,valid_until=excluded.valid_until,reason=excluded.reason,
 updated_by=excluded.updated_by,updated_at=now();
 select to_jsonb(a) into next_access from public.aeromind_gold_access a where a.user_id=target_user;
 insert into public.aeromind_gold_audit(user_id,actor_id,action,old_value,new_value,reason)
 values(target_user,actor,case when p_enabled then 'access_granted' else 'access_revoked' end,previous,next_access,reason_text);
 return jsonb_build_object('ok',true,'enabled',p_enabled,'valid_until',case when p_enabled then p_valid_until else null end);
end $$;
revoke all on function public.aeromind_gold_admin_set_access(text,boolean,timestamptz,text) from public,anon,authenticated;
grant execute on function public.aeromind_gold_admin_set_access(text,boolean,timestamptz,text) to authenticated;

create or replace function public.aeromind_gold_admin_save_config(
 p_email text,p_settings jsonb,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); target_user uuid; next_version integer; previous jsonb;
 reason_text text:=btrim(coalesce(p_reason,''));
begin
 if actor is null or not exists(select 1 from public.aeromind_staff where user_id=actor and role in ('admin','owner'))
 then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 if char_length(reason_text) not between 8 and 500 or not private.aeromind_gold_valid_settings(p_settings)
 then raise exception 'Configuração ou motivo inválido' using errcode='22023';end if;
 if p_email is null or char_length(btrim(p_email))>320 then raise exception 'E-mail inválido' using errcode='22023';end if;
 select u.id into target_user from auth.users u where lower(u.email)=lower(btrim(p_email)) limit 1;
 if target_user is null then raise exception 'Cliente não encontrado' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(target_user::text,99237));
 select v.settings into previous from public.aeromind_gold_config_versions v where v.user_id=target_user order by v.version desc limit 1;
 select coalesce(max(v.version),0)+1 into next_version from public.aeromind_gold_config_versions v where v.user_id=target_user;
 insert into public.aeromind_gold_config_versions(user_id,version,settings,changed_by,reason)
 values(target_user,next_version,p_settings,actor,reason_text);
 insert into public.aeromind_gold_audit(user_id,actor_id,action,old_value,new_value,reason)
 values(target_user,actor,'config_saved',previous,p_settings,reason_text);
 return jsonb_build_object('ok',true,'version',next_version);
end $$;
revoke all on function public.aeromind_gold_admin_save_config(text,jsonb,text) from public,anon,authenticated;
grant execute on function public.aeromind_gold_admin_save_config(text,jsonb,text) to authenticated;

create or replace function public.aeromind_gold_admin_overview()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from public.aeromind_staff where user_id=actor and role in ('admin','owner'))
 then raise exception 'Acesso administrativo negado' using errcode='42501';end if;
 return jsonb_build_object(
 'global_enabled',(select enabled from private.aeromind_gold_rollout where singleton=true),
 'checkout_enabled',(select checkout_enabled from private.aeromind_gold_rollout where singleton=true),
 'accesses',coalesce((
  select jsonb_agg(jsonb_build_object('user_id',a.user_id,'email',u.email,
  'enabled',a.enabled,'valid_until',a.valid_until,'updated_at',a.updated_at,
  'reason',a.reason,'config_version',(select max(v.version) from public.aeromind_gold_config_versions v where v.user_id=a.user_id),
  'settings',(select v.settings from public.aeromind_gold_config_versions v where v.user_id=a.user_id order by v.version desc limit 1)))
  from (select * from public.aeromind_gold_access order by updated_at desc limit 100) a
  join auth.users u on u.id=a.user_id
 ),'[]'::jsonb),
 'audit',coalesce((
  select jsonb_agg(jsonb_build_object('email',u.email,'action',a.action,'reason',a.reason,
  'created_at',a.created_at))
  from (select * from public.aeromind_gold_audit order by created_at desc limit 40) a
  join auth.users u on u.id=a.user_id
 ),'[]'::jsonb));
end $$;
revoke all on function public.aeromind_gold_admin_overview() from public,anon,authenticated;
grant execute on function public.aeromind_gold_admin_overview() to authenticated;

-- Additive entitlement lookup for a future Android integration.
-- Gold is always false while rollout.enabled=false, even if admin pre-granted someone.
create or replace function public.aeromind_gold_my_entitlement()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare who uuid:=auth.uid(); has_base boolean; enabled_flag boolean; gold public.aeromind_gold_access%rowtype;
begin
 if who is null then raise exception 'Entre na sua conta' using errcode='42501';end if;
 select exists(select 1 from public.licenses l where l.user_id=who and l.status='active' and l.valid_until>now()) into has_base;
 select r.enabled into enabled_flag from private.aeromind_gold_rollout r where r.singleton=true;
 select a.* into gold from public.aeromind_gold_access a where a.user_id=who;
 return jsonb_build_object('app_access',has_base,'gold_access',coalesce(gold.enabled,false),
 'gold_expires_at',gold.valid_until,'gold_rollout_enabled',coalesce(enabled_flag,false),
 'can_use_gold',has_base and coalesce(enabled_flag,false) and coalesce(gold.enabled,false) and coalesce(gold.valid_until>now(),false));
end $$;
revoke all on function public.aeromind_gold_my_entitlement() from public,anon,authenticated;
grant execute on function public.aeromind_gold_my_entitlement() to authenticated;
