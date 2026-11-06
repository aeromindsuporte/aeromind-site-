-- Diagnóstico automático da conta ADM AeroMind.
-- Retenção 48h; NENHUM URL, token, cookie, payload de jogo ou texto livre.
-- A coleta de qualquer usuário comum é recusada no servidor.
create table if not exists public.aeromind_admin_diagnostic_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null,
  event_id uuid not null unique,
  boot_id uuid not null,
  app_code smallint not null check (app_code between 70 and 32767),
  sdk_code smallint check (sdk_code between 26 and 45),
  observed_at timestamptz not null,
  received_at timestamptz not null default pg_catalog.now(),
  event_type text not null check (char_length(event_type) between 3 and 50),
  stage text not null,
  window_type text not null,
  web_error_code smallint,
  iframe_count smallint,
  game_frames smallint,
  real_game_frames smallint,
  launcher_frames smallint,
  provider_frames smallint,
  ready_state text
);
create index if not exists aeromind_admin_diagnostic_received_idx
  on public.aeromind_admin_diagnostic_events (received_at);
create index if not exists aeromind_admin_diagnostic_owner_time_idx
  on public.aeromind_admin_diagnostic_events (owner_id, observed_at desc);
alter table public.aeromind_admin_diagnostic_events enable row level security;
revoke all on public.aeromind_admin_diagnostic_events from public,anon,authenticated;
grant select on public.aeromind_admin_diagnostic_events to authenticated;
drop policy if exists aeromind_diag_owner_read on public.aeromind_admin_diagnostic_events;
create policy aeromind_diag_owner_read
  on public.aeromind_admin_diagnostic_events for select to authenticated
  using (owner_id=(select auth.uid())
     and owner_id='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid);

create or replace function public.aeromind_admin_diagnostic_ingest(
 p_install_hash text,p_events jsonb)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid := (select auth.uid());
  e jsonb;
  ts timestamptz;
  sent integer;
  n integer:=0;
  added integer:=0;
  removed integer:=0;
  limit_today integer;
  kind text;
  stage text;
  window_kind text;
  ready text;
  v_fr smallint;
  v_ga smallint;
  v_real smallint;
  v_start smallint;
  v_provider smallint;
  v_code smallint;
  v_sdk smallint;
begin
  if v_uid is distinct from 'c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid then
    raise exception 'Diagnostico exclusivo da conta proprietaria' using errcode='42501';
  end if;
  if p_install_hash is null or p_install_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Dispositivo invalido' using errcode='42501';
  end if;
  if not exists(select 1 from public.aeromind_devices d
      where d.user_id=v_uid and d.install_hash=p_install_hash and d.status='active')
     or not exists(select 1 from public.licenses l
      where l.user_id=v_uid and l.status='active' and l.valid_until>pg_catalog.clock_timestamp()) then
    raise exception 'Licenca ou dispositivo sem autorizacao' using errcode='42501';
  end if;
  if pg_catalog.jsonb_typeof(p_events) is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_events)>15
     or pg_catalog.octet_length(p_events::text)>20000 then
    raise exception 'Lote de diagnostico fora dos limites' using errcode='22023';
  end if;
  sent:=pg_catalog.jsonb_array_length(p_events);
  select count(*) into limit_today from public.aeromind_admin_diagnostic_events
   where owner_id=v_uid and received_at>=pg_catalog.clock_timestamp()-interval '24 hours';
  for e in select value from pg_catalog.jsonb_array_elements(p_events) loop
    if pg_catalog.jsonb_typeof(e) is distinct from 'object' then
      removed:=removed+1;continue;
    end if;
    if (e->>'id') is null or (e->>'id') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (e->>'boot') is null or (e->>'boot') !~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (e->>'ts') is null or (e->>'ts') !~ '^[0-9]{13}$'
      or (e->>'v') is null or (e->>'v') !~ '^[0-9]{2,5}$'
    then removed:=removed+1;continue;end if;
    ts:=pg_catalog.to_timestamp((e->>'ts')::double precision/1000.0);
    if ts < pg_catalog.clock_timestamp()-interval '48 hours'
      or ts > pg_catalog.clock_timestamp()+interval '5 minutes'
      or (e->>'v')::integer not between 70 and 32767
    then removed:=removed+1;continue;end if;
    kind:=e->>'type';
    if kind is null or kind not in (
      'app_start','monitor_started','monitor_stopped','page_started',
      'page_finished','web_error','game_popup_session_preserved',
      'game_popup_error','game_launch_probe','game_launch_probe_invalid',
      'game_launch_probe_unavailable','game_launch_response',
      'game_session_recovery','game_session_error','game_layout_error',
      'web_state_restore','web_state_restore_error','game_login_request_seen',
      'active_frame_changed','history_dom_baseline','ws_open','ws_close',
      'frame_ready','app_background','app_foreground','app_stopped',
      'capability_missing','inject_error','fallback_inject_error',
      'bridge_parse_error','game_launch_recovery_skipped'
    ) then removed:=removed+1;continue;end if;
    stage:=e->>'stage';
    if stage not in ('platform','provider','launcher','aviator',
      'websocket','other','unknown') or stage is null then stage:='unknown';end if;
    window_kind:=e->>'window';
    if window_kind not in ('platform','provider_popup','unknown')
       or window_kind is null then window_kind:='unknown';end if;
    ready:=e->>'ready';
    if ready not in ('loading','interactive','complete','unknown') or ready is null
    then ready:='unknown';end if;
    -- NENHUMA string de texto livre é gravada. Números são limitados.
    v_fr:=case when (e->>'fr') ~ '^[0-9]{1,3}$' then (e->>'fr')::smallint else null end;
    v_ga:=case when (e->>'ga') ~ '^[0-9]{1,3}$' then (e->>'ga')::smallint else null end;
    v_real:=case when (e->>'real') ~ '^[0-9]{1,3}$' then (e->>'real')::smallint else null end;
    v_start:=case when (e->>'start') ~ '^[0-9]{1,3}$' then (e->>'start')::smallint else null end;
    v_provider:=case when (e->>'provider') ~ '^[0-9]{1,3}$' then (e->>'provider')::smallint else null end;
    v_code:=case when (e->>'code') ~ '^-?[0-9]{1,4}$' and
      (e->>'code')::integer between -1500 and 1500
      then (e->>'code')::smallint else null end;
    v_sdk:=case when (e->>'sdk') ~ '^[0-9]{2}$' and
      (e->>'sdk')::integer between 26 and 45 then (e->>'sdk')::smallint else null end;
    if limit_today >= 500 then removed:=removed+1; continue; end if;
    insert into public.aeromind_admin_diagnostic_events (
      owner_id,event_id,boot_id,app_code,sdk_code,observed_at,event_type,
      stage,window_type,web_error_code,iframe_count,game_frames,
      real_game_frames,launcher_frames,provider_frames,ready_state)
    values(v_uid,(e->>'id')::uuid,(e->>'boot')::uuid,(e->>'v')::smallint,
      v_sdk,ts,kind,stage,window_kind,v_code,v_fr,v_ga,v_real,v_start,v_provider,ready)
    on conflict(event_id) do nothing;
    get diagnostics n=row_count;
    added:=added+n;
    limit_today:=limit_today+n;
  end loop;
  return pg_catalog.jsonb_build_object('received',sent,'inserted',added,'ignored',removed);
end;
$$;

revoke all on function public.aeromind_admin_diagnostic_ingest(text,jsonb)
  from public, anon;
grant execute on function public.aeromind_admin_diagnostic_ingest(text,jsonb)
  to authenticated;

-- Retenção real independe de novos uploads; limpa mesmo se o aparelho desligar.
select cron.schedule(
 'aeromind_admin_diagnostics_prune_48h', '*/15 * * * *',
 $$delete from public.aeromind_admin_diagnostic_events
   where received_at < pg_catalog.clock_timestamp()-interval '48 hours';$$
);
