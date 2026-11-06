
-- AeroMind: auditoria leve e exclusiva do administrador.
-- Apenas resultados confirmados ao vivo; estatísticas diárias agregadas permanecem por 90 dias.
create table if not exists public.aeromind_indicator_telemetry (
  id bigint generated always as identity primary key,
  owner_id uuid not null default auth.uid(),
  event_key text not null unique check (event_key ~ '^[0-9a-f]{64}$'),
  install_id uuid not null,
  analysis_session text not null check (char_length(analysis_session) between 1 and 90),
  round_sequence integer not null check (round_sequence > 0),
  round_at timestamptz not null,
  received_at timestamptz not null default clock_timestamp(),
  source_kind text not null check (char_length(source_kind) between 1 and 60),
  actual_x numeric(9,2) not null check (actual_x between 1 and 100000),
  p25_x numeric(9,2) not null check (p25_x between 1 and 100000),
  p50_x numeric(9,2) not null check (p50_x between 1 and 100000),
  p75_x numeric(9,2) not null check (p75_x between 1 and 100000),
  sample_size smallint not null check (sample_size between 3 and 100),
  continuous boolean not null,
  risk_target_x numeric(9,2) check (risk_target_x between 1 and 100000),
  risk_state text not null check (risk_state in ('IDLE','ACTIVE','WIN','LOSS','INTERRUPTED')),
  risk_attempt smallint not null check (risk_attempt between 0 and 8),
  risk_signal text check (char_length(risk_signal) <= 150),
  risk_outcome text check (risk_outcome in ('WIN','LOSS','INTERRUPTED')),
  model_version text not null check (char_length(model_version) between 3 and 60)
);
create index if not exists aeromind_indicator_telemetry_received_idx
  on public.aeromind_indicator_telemetry(received_at);
create index if not exists aeromind_indicator_telemetry_round_idx
  on public.aeromind_indicator_telemetry(round_at desc);

create table if not exists public.aeromind_indicator_daily (
  owner_id uuid not null,
  observed_day date not null,
  model_version text not null,
  received integer not null default 0,
  valid_rounds integer not null default 0,
  interrupted_rounds integer not null default 0,
  baixa_hits integer not null default 0,
  mediana_hits integer not null default 0,
  alta_hits integer not null default 0,
  risk_wins integer not null default 0,
  risk_losses integer not null default 0,
  risk_interruptions integer not null default 0,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (owner_id, observed_day, model_version)
);
create table if not exists public.aeromind_indicator_cleanup_control (
  singleton boolean primary key default true check (singleton),
  last_cleanup timestamptz not null default '2000-01-01'::timestamptz
);
insert into public.aeromind_indicator_cleanup_control (singleton) values (true)
on conflict do nothing;

alter table public.aeromind_indicator_telemetry enable row level security;
alter table public.aeromind_indicator_daily enable row level security;
alter table public.aeromind_indicator_cleanup_control enable row level security;
revoke all on public.aeromind_indicator_telemetry from anon, authenticated;
revoke all on public.aeromind_indicator_daily from anon, authenticated;
revoke all on public.aeromind_indicator_cleanup_control from anon, authenticated;
grant select, insert on public.aeromind_indicator_telemetry to authenticated;
grant select, insert, update on public.aeromind_indicator_daily to authenticated;
grant select, update on public.aeromind_indicator_cleanup_control to authenticated;

create policy aeromind_indicator_owner_read on public.aeromind_indicator_telemetry
 for select to authenticated
 using (owner_id = (select auth.uid()) and owner_id = 'c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid);
create policy aeromind_indicator_owner_insert on public.aeromind_indicator_telemetry
 for insert to authenticated
 with check (owner_id = (select auth.uid()) and owner_id = 'c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid);
create policy aeromind_indicator_daily_read on public.aeromind_indicator_daily
 for select to authenticated
 using (owner_id = (select auth.uid()) and owner_id = 'c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid);
create policy aeromind_indicator_daily_insert on public.aeromind_indicator_daily
 for insert to authenticated
 with check (owner_id = (select auth.uid()) and owner_id = 'c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid);
create policy aeromind_indicator_daily_update on public.aeromind_indicator_daily
 for update to authenticated
 using (owner_id = (select auth.uid()) and owner_id = 'c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
 with check (owner_id = (select auth.uid()) and owner_id = 'c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid);
create policy aeromind_indicator_cleanup_admin_read on public.aeromind_indicator_cleanup_control
 for select to authenticated
 using ((select auth.uid()) = 'c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid);
create policy aeromind_indicator_cleanup_admin_update on public.aeromind_indicator_cleanup_control
 for update to authenticated
 using ((select auth.uid()) = 'c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
 with check ((select auth.uid()) = 'c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid);

create or replace function public.aeromind_indicator_telemetry_ingest(p_events jsonb)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  e jsonb;
  rec_id bigint;
  event_time timestamptz;
  total integer := 0;
  added integer := 0;
  duplicates integer := 0;
  expired integer := 0;
  is_valid boolean;
  risk_result text;
  did_cleanup boolean;
begin
  if (select auth.uid()) is distinct from 'c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid then
    raise exception 'Acesso restrito ao administrador AeroMind' using errcode = '42501';
  end if;
  if pg_catalog.jsonb_typeof(p_events) is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_events) > 25 then
    raise exception 'Lote de telemetria invalido' using errcode = '22023';
  end if;
  total := pg_catalog.jsonb_array_length(p_events);
  for e in select value from pg_catalog.jsonb_array_elements(p_events) loop
    event_time := pg_catalog.to_timestamp((e->>'ts')::double precision / 1000.0);
    if event_time < pg_catalog.clock_timestamp()-interval '48 hours'
       or event_time > pg_catalog.clock_timestamp()+interval '5 minutes' then
      expired := expired+1;
      continue;
    end if;
    is_valid := (e->>'ok')::boolean;
    risk_result := pg_catalog.nullif(e->>'ro','');
    rec_id := null;
    insert into public.aeromind_indicator_telemetry (
       owner_id,event_key,install_id,analysis_session,round_sequence,
       round_at,source_kind,actual_x,p25_x,p50_x,p75_x,sample_size,continuous,
       risk_target_x,risk_state,risk_attempt,risk_signal,risk_outcome,model_version
    ) values (
       (select auth.uid()), e->>'k', (e->>'d')::uuid, pg_catalog.left(e->>'ss',90),
       (e->>'q')::integer, event_time, pg_catalog.left(e->>'src',60),
       (e->>'a')::numeric,(e->>'l')::numeric,(e->>'m')::numeric,(e->>'h')::numeric,
       (e->>'n')::smallint,is_valid,
       (e->>'r')::numeric, e->>'rs',(e->>'ra')::smallint,
       pg_catalog.nullif(pg_catalog.left(e->>'rk',150),''),
       risk_result, pg_catalog.left(e->>'v',60)
    )
    on conflict (event_key) do nothing
    returning id into rec_id;
    if rec_id is null then
      duplicates := duplicates+1;
      continue;
    end if;
    added := added+1;
    insert into public.aeromind_indicator_daily (
      owner_id,observed_day,model_version,received,valid_rounds,interrupted_rounds,
      baixa_hits,mediana_hits,alta_hits,risk_wins,risk_losses,risk_interruptions
    ) values (
      (select auth.uid()),(event_time at time zone 'UTC')::date,pg_catalog.left(e->>'v',60),
      1,case when is_valid then 1 else 0 end,case when is_valid then 0 else 1 end,
      case when is_valid and (e->>'a')::numeric >= (e->>'l')::numeric then 1 else 0 end,
      case when is_valid and (e->>'a')::numeric >= (e->>'m')::numeric then 1 else 0 end,
      case when is_valid and (e->>'a')::numeric >= (e->>'h')::numeric then 1 else 0 end,
      case when risk_result='WIN' then 1 else 0 end,
      case when risk_result='LOSS' then 1 else 0 end,
      case when risk_result='INTERRUPTED' then 1 else 0 end
    )
    on conflict (owner_id,observed_day,model_version) do update set
      received=public.aeromind_indicator_daily.received+excluded.received,
      valid_rounds=public.aeromind_indicator_daily.valid_rounds+excluded.valid_rounds,
      interrupted_rounds=public.aeromind_indicator_daily.interrupted_rounds+excluded.interrupted_rounds,
      baixa_hits=public.aeromind_indicator_daily.baixa_hits+excluded.baixa_hits,
      mediana_hits=public.aeromind_indicator_daily.mediana_hits+excluded.mediana_hits,
      alta_hits=public.aeromind_indicator_daily.alta_hits+excluded.alta_hits,
      risk_wins=public.aeromind_indicator_daily.risk_wins+excluded.risk_wins,
      risk_losses=public.aeromind_indicator_daily.risk_losses+excluded.risk_losses,
      risk_interruptions=public.aeromind_indicator_daily.risk_interruptions+excluded.risk_interruptions,
      updated_at=pg_catalog.clock_timestamp();
  end loop;
  did_cleanup := false;
  update public.aeromind_indicator_cleanup_control
     set last_cleanup = pg_catalog.clock_timestamp()
   where singleton = true and last_cleanup < pg_catalog.clock_timestamp()-interval '1 hour'
   returning true into did_cleanup;
  if did_cleanup then
    delete from public.aeromind_indicator_telemetry
      where received_at < pg_catalog.clock_timestamp()-interval '48 hours';
    delete from public.aeromind_indicator_daily
      where observed_day < (pg_catalog.clock_timestamp() at time zone 'UTC')::date - 90;
  end if;
  return pg_catalog.jsonb_build_object(
    'received',total,'inserted',added,'duplicates',duplicates,'expired',expired
  );
end;
$$;
revoke all on function public.aeromind_indicator_telemetry_ingest(jsonb) from public, anon;
grant execute on function public.aeromind_indicator_telemetry_ingest(jsonb) to authenticated;
