-- Reaplica a definição corrigida da RPC no ambiente já migrado.
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
    risk_result := nullif(e->>'ro','');
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
       nullif(pg_catalog.left(e->>'rk',150),''),
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
