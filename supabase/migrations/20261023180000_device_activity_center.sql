-- AeroMind: eventos de aparelhos e solicitações, sem alterar autorizações.
create table if not exists public.aeromind_device_activity (
  id bigint generated always as identity primary key,
  source_kind text not null check (source_kind in ('device_audit','support_ticket')),
  source_ref text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid,
  ticket_id uuid references public.aeromind_support_tickets(id) on delete set null,
  actor_id uuid,
  event_type text not null check(event_type in ('registered','reactivated','authorized','revoked','support_request')),
  device_name text,
  detail text,
  occurred_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  unique(source_kind,source_ref)
);
create index if not exists aeromind_device_activity_customer_idx
 on public.aeromind_device_activity(user_id,occurred_at desc);
create index if not exists aeromind_device_activity_pending_idx
 on public.aeromind_device_activity(occurred_at desc) where reviewed_at is null;
alter table public.aeromind_device_activity enable row level security;
revoke all on public.aeromind_device_activity from public,anon,authenticated;
grant select on public.aeromind_device_activity to authenticated;
drop policy if exists aeromind_device_activity_staff_read on public.aeromind_device_activity;
create policy aeromind_device_activity_staff_read on public.aeromind_device_activity
 for select to authenticated using ((select private.aeromind_verified_staff()));

-- A categoria própria distingue troca de aparelho de pedidos genéricos.
alter table public.aeromind_support_tickets
 drop constraint if exists aeromind_support_tickets_category_check;
alter table public.aeromind_support_tickets
 add constraint aeromind_support_tickets_category_check
 check (category in ('geral','acesso','licenca','instalacao','pagamento','dispositivo'));

-- Trigger usa a auditoria existente dos RPCs, sem duplicar a lógica de revogação.
create or replace function private.aeromind_capture_device_audit()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.aeromind_device_activity
   (source_kind,source_ref,user_id,device_id,actor_id,event_type,device_name,detail,occurred_at)
 select 'device_audit',new.id::text,d.user_id,d.id,new.actor_id,
        case new.action when 'register' then 'registered'
          when 'reactivate' then 'reactivated'
          when 'approve' then 'authorized' else 'revoked' end,
        d.device_name,
        case new.action when 'register' then 'Aparelho solicitou vínculo'
          when 'reactivate' then 'Aparelho solicitou novo vínculo'
          when 'approve' then 'Aparelho autorizado'
          else 'Acesso do aparelho revogado' end,
        new.created_at
 from public.aeromind_devices d where d.id=new.device_id
 on conflict (source_kind,source_ref) do nothing;
 return new;
end;
$$;
revoke all on function private.aeromind_capture_device_audit() from public,anon,authenticated;
drop trigger if exists aeromind_capture_device_audit on public.aeromind_device_audit;
create trigger aeromind_capture_device_audit
 after insert on public.aeromind_device_audit for each row
 execute function private.aeromind_capture_device_audit();

-- Pedidos classificados como dispositivo ou contendo assunto de revogação/troca.
create or replace function private.aeromind_capture_device_ticket()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.category = 'dispositivo'
   or new.subject ~* '(revog|desvincul|aparelho|celular|dispositivo)'
 then
  insert into public.aeromind_device_activity
   (source_kind,source_ref,user_id,ticket_id,actor_id,event_type,detail,occurred_at)
  values ('support_ticket',new.id::text,new.user_id,new.id,new.user_id,
          'support_request',left(new.subject,140),new.created_at)
  on conflict (source_kind,source_ref) do nothing;
 end if;
 return new;
end;
$$;
revoke all on function private.aeromind_capture_device_ticket() from public,anon,authenticated;
drop trigger if exists aeromind_capture_device_ticket on public.aeromind_support_tickets;
create trigger aeromind_capture_device_ticket
 after insert on public.aeromind_support_tickets for each row
 execute function private.aeromind_capture_device_ticket();

-- Somente administradores confirmados marcam notificações como verificadas.
create or replace function public.aeromind_mark_device_event_seen(p_event_id bigint)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not private.aeromind_verified_staff() then
  raise exception 'Administração necessária' using errcode='42501';
 end if;
 if p_event_id is null then return false; end if;
 update public.aeromind_device_activity
    set reviewed_at=now(),reviewed_by=auth.uid()
  where id=p_event_id and reviewed_at is null;
 return exists(select 1 from public.aeromind_device_activity where id=p_event_id);
end;
$$;
revoke all on function public.aeromind_mark_device_event_seen(bigint) from public,anon,authenticated;
grant execute on function public.aeromind_mark_device_event_seen(bigint) to authenticated;

-- Importa o histórico anterior como já visto, evitando alertas falsos antigos.
insert into public.aeromind_device_activity
(source_kind,source_ref,user_id,device_id,actor_id,event_type,device_name,detail,occurred_at,reviewed_at)
select 'device_audit',a.id::text,d.user_id,d.id,a.actor_id,
 case a.action when 'register' then 'registered' when 'reactivate' then 'reactivated'
  when 'approve' then 'authorized' else 'revoked' end,
 d.device_name,'Histórico anterior: '||a.action,a.created_at,now()
from public.aeromind_device_audit a join public.aeromind_devices d on d.id=a.device_id
on conflict (source_kind,source_ref) do nothing;
