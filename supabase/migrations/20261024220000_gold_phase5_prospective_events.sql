-- AeroMind Gold Fase 5: laboratório prospectivo, somente operadores admin/owner.
-- Todos os registros criados por RPC possuem horário do SERVIDOR.
-- Sem conexão automática com o jogo. Operações são declarações manuais, não prova de feed ao vivo.
-- Migração apenas aditiva: nenhuma licença, pedido Pix ou tabela Gold legada é alterada.

create table if not exists public.aeromind_gold_round_observations(
 id bigint generated always as identity primary key,
 subject_id uuid not null references auth.users(id) on delete cascade,
 stream_key text not null check(stream_key ~ '^[a-zA-Z0-9_-]{3,48}$'),
 round_key text not null check(round_key ~ '^[a-zA-Z0-9_.:-]{1,80}$'),
 multiplier numeric(12,4) not null check(multiplier>=1 and multiplier<=1000000),
 source_kind text not null default 'manual_admin' check(source_kind='manual_admin'),
 observed_at timestamptz not null default clock_timestamp(),
 recorded_by uuid references auth.users(id) on delete set null,
 unique(subject_id,stream_key,round_key)
);
create index if not exists gold_round_subject_recent on public.aeromind_gold_round_observations(subject_id,observed_at desc,id desc);
alter table public.aeromind_gold_round_observations enable row level security;
revoke all on public.aeromind_gold_round_observations from public,anon,authenticated;
grant select on public.aeromind_gold_round_observations to authenticated;
create policy gold_round_staff_read on public.aeromind_gold_round_observations
 for select to authenticated using (exists(
  select 1 from public.aeromind_staff s where s.user_id=(select auth.uid()) and s.role in ('admin','owner')
 ));

create table if not exists public.aeromind_gold_prospective_signals(
 id bigint generated always as identity primary key,
 subject_id uuid not null references auth.users(id) on delete cascade,
 stream_key text not null check(stream_key ~ '^[a-zA-Z0-9_-]{3,48}$'),
 next_round_key text not null check(next_round_key ~ '^[a-zA-Z0-9_.:-]{1,80}$'),
 anchor_round_id bigint not null references public.aeromind_gold_round_observations(id) on delete cascade,
 profile text not null check(profile in ('Clássico','Refinado','Gold')),
 indicator text not null check(indicator in ('BAIXA','MEDIANA','ALTA')),
 target_x numeric(12,4) not null check(target_x>=1 and target_x<=1000000),
 rule_version text not null check(char_length(rule_version) between 3 and 80),
 evidence_type text not null default 'manual_declared' check(evidence_type='manual_declared'),
 emitted_at timestamptz not null default clock_timestamp(),
 recorded_by uuid references auth.users(id) on delete set null,
 unique(subject_id,stream_key,next_round_key,profile,indicator)
);
create index if not exists gold_signal_subject_recent on public.aeromind_gold_prospective_signals(subject_id,emitted_at desc,id desc);
alter table public.aeromind_gold_prospective_signals enable row level security;
revoke all on public.aeromind_gold_prospective_signals from public,anon,authenticated;
grant select on public.aeromind_gold_prospective_signals to authenticated;
create policy gold_signal_staff_read on public.aeromind_gold_prospective_signals
 for select to authenticated using (exists(
  select 1 from public.aeromind_staff s where s.user_id=(select auth.uid()) and s.role in ('admin','owner')
 ));

create table if not exists public.aeromind_gold_report_exports(
 id bigint generated always as identity primary key,
 subject_id uuid not null references auth.users(id) on delete cascade,
 requested_by uuid references auth.users(id) on delete set null,
 rows_exported integer not null check(rows_exported>=0 and rows_exported<=200),
 exported_at timestamptz not null default clock_timestamp(),
 format text not null default 'csv' check(format='csv')
);
create index if not exists gold_export_subject_recent on public.aeromind_gold_report_exports(subject_id,exported_at desc);
alter table public.aeromind_gold_report_exports enable row level security;
revoke all on public.aeromind_gold_report_exports from public,anon,authenticated;
grant select on public.aeromind_gold_report_exports to authenticated;
create policy gold_export_staff_read on public.aeromind_gold_report_exports
 for select to authenticated using (exists(
  select 1 from public.aeromind_staff s where s.user_id=(select auth.uid()) and s.role in ('admin','owner')
 ));

create or replace function public.aeromind_gold_admin_record_round(
 p_subject_id uuid,p_stream text,p_round_key text,p_multiplier numeric
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); new_id bigint;
begin
 if actor is null or not exists(select 1 from public.aeromind_staff where user_id=actor and role in ('admin','owner'))
  then raise exception 'Sem permissão' using errcode='42501';end if;
 if p_subject_id is null or not exists(select 1 from auth.users where id=p_subject_id)
  or p_stream is null or p_stream !~ '^[a-zA-Z0-9_-]{3,48}$'
  or p_round_key is null or p_round_key !~ '^[a-zA-Z0-9_.:-]{1,80}$'
  or p_multiplier is null or p_multiplier<1 or p_multiplier>1000000
  then raise exception 'Rodada inválida' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_subject_id::text||':'||p_stream,55124));
 if exists(select 1 from public.aeromind_gold_round_observations
  where subject_id=p_subject_id and stream_key=p_stream and round_key=p_round_key)
  then raise exception 'Rodada duplicada' using errcode='23505';end if;
 insert into public.aeromind_gold_round_observations(subject_id,stream_key,round_key,multiplier,recorded_by)
 values(p_subject_id,p_stream,p_round_key,p_multiplier,actor) returning id into new_id;
 return jsonb_build_object('ok',true,'id',new_id);
end $$;
revoke all on function public.aeromind_gold_admin_record_round(uuid,text,text,numeric) from public,anon,authenticated;
grant execute on function public.aeromind_gold_admin_record_round(uuid,text,text,numeric) to authenticated;

create or replace function public.aeromind_gold_admin_record_signal(
 p_subject_id uuid,p_stream text,p_next_round_key text,p_anchor_round_key text,
 p_profile text,p_indicator text,p_target_x numeric,p_rule_version text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); last_id bigint; last_key text; new_id bigint;
begin
 if actor is null or not exists(select 1 from public.aeromind_staff where user_id=actor and role in ('admin','owner'))
  then raise exception 'Sem permissão' using errcode='42501';end if;
 if p_subject_id is null or not exists(select 1 from auth.users where id=p_subject_id)
  or p_stream is null or p_stream !~ '^[a-zA-Z0-9_-]{3,48}$'
  or p_next_round_key is null or p_next_round_key !~ '^[a-zA-Z0-9_.:-]{1,80}$'
  or p_anchor_round_key is null or p_anchor_round_key !~ '^[a-zA-Z0-9_.:-]{1,80}$'
  or p_profile not in ('Clássico','Refinado','Gold')
  or p_indicator not in ('BAIXA','MEDIANA','ALTA')
  or p_target_x is null or p_target_x<1 or p_target_x>1000000
  or p_rule_version is null or char_length(p_rule_version) not between 3 and 80
  or p_rule_version !~ '^[a-zA-Z0-9_.:-]{3,80}$'
  then raise exception 'Sinal inválido' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_subject_id::text||':'||p_stream,55124));
 select id,round_key into last_id,last_key
 from public.aeromind_gold_round_observations
 where subject_id=p_subject_id and stream_key=p_stream
 order by observed_at desc,id desc limit 1;
 if last_id is null or last_key is distinct from p_anchor_round_key or p_next_round_key=p_anchor_round_key
  then raise exception 'A rodada anterior não corresponde ao último resultado' using errcode='22023';end if;
 if exists(select 1 from public.aeromind_gold_round_observations
  where subject_id=p_subject_id and stream_key=p_stream and round_key=p_next_round_key)
  then raise exception 'Resultado já registrado antes do sinal' using errcode='22023';end if;
 if exists(select 1 from public.aeromind_gold_prospective_signals
  where subject_id=p_subject_id and stream_key=p_stream and next_round_key=p_next_round_key and profile=p_profile and indicator=p_indicator)
  then raise exception 'Sinal duplicado' using errcode='23505';end if;
 insert into public.aeromind_gold_prospective_signals
  (subject_id,stream_key,next_round_key,anchor_round_id,profile,indicator,target_x,rule_version,recorded_by)
 values(p_subject_id,p_stream,p_next_round_key,last_id,p_profile,p_indicator,p_target_x,p_rule_version,actor)
 returning id into new_id;
 return jsonb_build_object('ok',true,'id',new_id);
end $$;
revoke all on function public.aeromind_gold_admin_record_signal(uuid,text,text,text,text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.aeromind_gold_admin_record_signal(uuid,text,text,text,text,text,numeric,text) to authenticated;

create or replace function public.aeromind_gold_admin_log_export(
 p_subject_id uuid,p_count integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); new_id bigint;
begin
 if actor is null or not exists(select 1 from public.aeromind_staff where user_id=actor and role in ('admin','owner'))
  then raise exception 'Sem permissão' using errcode='42501';end if;
 if p_subject_id is null or not exists(select 1 from auth.users where id=p_subject_id)
  or p_count is null or p_count<0 or p_count>200
  then raise exception 'Exportação inválida' using errcode='22023';end if;
 insert into public.aeromind_gold_report_exports(subject_id,requested_by,rows_exported)
 values(p_subject_id,actor,p_count) returning id into new_id;
 return jsonb_build_object('ok',true,'id',new_id);
end $$;
revoke all on function public.aeromind_gold_admin_log_export(uuid,integer) from public,anon,authenticated;
grant execute on function public.aeromind_gold_admin_log_export(uuid,integer) to authenticated;
