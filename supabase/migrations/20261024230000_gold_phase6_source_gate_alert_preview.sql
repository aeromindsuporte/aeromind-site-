-- AeroMind Gold Fase 6: regras somente para PRÉVIA administrativa, sem push, sem aposta.
-- Nenhuma fonte de resultados validada ou habilitada sem implantação posterior explícita.
create table if not exists private.aeromind_gold_source_gate(
 singleton boolean primary key default true check(singleton),
 state text not null default 'not_configured' check(state in ('not_configured','awaiting_provider')),
 provider_name text,
 ingestion_enabled boolean not null default false check(ingestion_enabled=false),
 external_delivery_enabled boolean not null default false check(external_delivery_enabled=false),
 verified_at timestamptz,
 updated_at timestamptz not null default clock_timestamp(),
 constraint gold_source_no_claim_without_provider check(
  state='not_configured' or (provider_name is not null and length(provider_name)>2)
 )
);
insert into private.aeromind_gold_source_gate(singleton) values(true) on conflict(singleton) do nothing;
alter table private.aeromind_gold_source_gate enable row level security;
revoke all on private.aeromind_gold_source_gate from public,anon,authenticated;

create table if not exists public.aeromind_gold_alert_preview_rules(
 id bigint generated always as identity primary key,
 subject_id uuid not null references auth.users(id) on delete cascade,
 profile text not null check(profile in ('Refinado','Gold')),
 indicator text not null check(indicator in ('BAIXA','MEDIANA','ALTA')),
 preview_enabled boolean not null default false,
 min_target_x numeric(12,4) not null default 2 check(min_target_x>=1 and min_target_x<=1000000),
 cooldown_minutes integer not null default 5 check(cooldown_minutes between 1 and 240),
 delivery_enabled boolean not null default false check(delivery_enabled=false),
 updated_at timestamptz not null default clock_timestamp(),
 updated_by uuid references auth.users(id) on delete set null,
 unique(subject_id,profile,indicator)
);
create index if not exists gold_alert_rules_subject on public.aeromind_gold_alert_preview_rules(subject_id,profile,indicator);
alter table public.aeromind_gold_alert_preview_rules enable row level security;
revoke all on public.aeromind_gold_alert_preview_rules from public,anon,authenticated;
grant select on public.aeromind_gold_alert_preview_rules to authenticated;
create policy gold_alert_preview_staff_read on public.aeromind_gold_alert_preview_rules
 for select to authenticated using(exists(
  select 1 from public.aeromind_staff staff
  where staff.user_id=(select auth.uid()) and staff.role in ('admin','owner')
 ));

create table if not exists public.aeromind_gold_alert_rule_audit(
 id bigint generated always as identity primary key,
 subject_id uuid not null references auth.users(id) on delete cascade,
 rule_id bigint references public.aeromind_gold_alert_preview_rules(id) on delete set null,
 action text not null default 'rule_saved' check(action='rule_saved'),
 before_value jsonb,
 after_value jsonb not null,
 reason text not null check(char_length(reason) between 8 and 500),
 created_at timestamptz not null default clock_timestamp(),
 created_by uuid references auth.users(id) on delete set null
);
create index if not exists gold_alert_audit_subject on public.aeromind_gold_alert_rule_audit(subject_id,created_at desc);
alter table public.aeromind_gold_alert_rule_audit enable row level security;
revoke all on public.aeromind_gold_alert_rule_audit from public,anon,authenticated;
grant select on public.aeromind_gold_alert_rule_audit to authenticated;
create policy gold_alert_audit_staff_read on public.aeromind_gold_alert_rule_audit
 for select to authenticated using(exists(
  select 1 from public.aeromind_staff staff
  where staff.user_id=(select auth.uid()) and staff.role in ('admin','owner')
 ));

create or replace function public.aeromind_gold_admin_source_status()
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); gate record;
begin
 if actor is null or not exists(select 1 from public.aeromind_staff staff
  where staff.user_id=actor and staff.role in ('admin','owner')) then
  raise exception 'Sem permissão' using errcode='42501';
 end if;
 select state,provider_name,ingestion_enabled,external_delivery_enabled,verified_at
 into gate from private.aeromind_gold_source_gate where singleton=true;
 return jsonb_build_object(
  'state',coalesce(gate.state,'not_configured'),
  'provider',gate.provider_name,
  'ingestionEnabled',coalesce(gate.ingestion_enabled,false),
  'deliveryEnabled',coalesce(gate.external_delivery_enabled,false),
  'verifiedAt',gate.verified_at
 );
end $$;
revoke all on function public.aeromind_gold_admin_source_status() from public,anon,authenticated;
grant execute on function public.aeromind_gold_admin_source_status() to authenticated;

create or replace function public.aeromind_gold_admin_save_alert_preview_rule(
 p_subject_id uuid,p_profile text,p_indicator text,p_preview_enabled boolean,
 p_min_target_x numeric,p_cooldown_minutes integer,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); old_row record; saved_id bigint; before_json jsonb;
begin
 if actor is null or not exists(select 1 from public.aeromind_staff staff
  where staff.user_id=actor and staff.role in ('admin','owner')) then
  raise exception 'Sem permissão' using errcode='42501';
 end if;
 if p_subject_id is null or not exists(select 1 from auth.users u where u.id=p_subject_id)
  or p_profile is null or p_profile not in ('Refinado','Gold')
  or p_indicator is null or p_indicator not in ('BAIXA','MEDIANA','ALTA')
  or p_preview_enabled is null
  or p_min_target_x is null or p_min_target_x<1 or p_min_target_x>1000000
  or p_cooldown_minutes is null or p_cooldown_minutes not between 1 and 240
  or p_reason is null or char_length(btrim(p_reason)) not between 8 and 500 then
  raise exception 'Regra inválida' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(
   p_subject_id::text||':'||p_profile||':'||p_indicator,60924));
 select * into old_row from public.aeromind_gold_alert_preview_rules
 where subject_id=p_subject_id and profile=p_profile and indicator=p_indicator for update;
 before_json:=case when found then jsonb_build_object(
   'previewEnabled',old_row.preview_enabled,
   'minTarget',old_row.min_target_x,
   'cooldownMinutes',old_row.cooldown_minutes) else null end;
 insert into public.aeromind_gold_alert_preview_rules
  (subject_id,profile,indicator,preview_enabled,min_target_x,cooldown_minutes,updated_by)
 values(p_subject_id,p_profile,p_indicator,p_preview_enabled,p_min_target_x,p_cooldown_minutes,actor)
 on conflict(subject_id,profile,indicator) do update set
  preview_enabled=excluded.preview_enabled,min_target_x=excluded.min_target_x,
  cooldown_minutes=excluded.cooldown_minutes,updated_by=excluded.updated_by,
  updated_at=clock_timestamp()
 returning id into saved_id;
 insert into public.aeromind_gold_alert_rule_audit
  (subject_id,rule_id,before_value,after_value,reason,created_by)
 values(p_subject_id,saved_id,before_json,
   jsonb_build_object('previewEnabled',p_preview_enabled,'minTarget',p_min_target_x,
    'cooldownMinutes',p_cooldown_minutes,'deliveryEnabled',false),
   btrim(p_reason),actor);
 return jsonb_build_object('ok',true,'ruleId',saved_id,'deliveryEnabled',false);
end $$;
revoke all on function public.aeromind_gold_admin_save_alert_preview_rule(uuid,text,text,boolean,numeric,integer,text) from public,anon,authenticated;
grant execute on function public.aeromind_gold_admin_save_alert_preview_rule(uuid,text,text,boolean,numeric,integer,text) to authenticated;
