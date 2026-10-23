-- Central de Comunicação AeroMind | site / campanhas / rascunhos / envio / agendamento
-- Migração aditiva: não altera licenças, pedidos, aparelhos ou tabelas anteriores.

create table if not exists public.aeromind_notification_campaigns (
  id uuid primary key default gen_random_uuid(),
  title varchar(100) not null,
  body varchar(500) not null,
  category text not null default 'comunicado'
    check(category in ('radar','comunicado','atualizacao','licenca')),
  audience_type text not null default 'active'
    check(audience_type in ('all','active','tier','user')),
  audience_tier text check(audience_tier in ('Básico','Pro','Ultra')),
  audience_user_id uuid references auth.users(id) on delete set null,
  channel_site boolean not null default true,
  channel_app boolean not null default false,
  channel_push boolean not null default false,
  priority text not null default 'normal' check(priority in ('normal','high')),
  validity_minutes integer check(validity_minutes between 1 and 10080),
  cta_label varchar(40) not null default 'Abrir minha conta',
  cta_path varchar(180) not null default '/minha-conta',
  status text not null default 'draft'
    check(status in ('draft','template','scheduled','sent','cancelled')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count integer not null default 0,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aeromind_notification_schedule_check
    check(status <> 'scheduled' or scheduled_at is not null),
  constraint aeromind_notification_audience_check
    check((audience_type <> 'tier' or audience_tier is not null)
       and (audience_type <> 'user' or audience_user_id is not null)),
  constraint aeromind_notification_cta_check
    check(cta_path ~ '^/[^/\\]*$' and position(':' in cta_path)=0
      and position(E'\\' in cta_path)=0),
  constraint aeromind_notification_content_check
    check(length(btrim(title)) >= 4 and length(btrim(body)) >= 5)
);

create table if not exists public.aeromind_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.aeromind_notification_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title varchar(100) not null,
  body varchar(500) not null,
  category text not null,
  priority text not null,
  cta_label varchar(40) not null,
  cta_path varchar(180) not null,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  read_at timestamptz,
  unique(campaign_id,user_id)
);
create index if not exists aeromind_notification_campaign_status_idx
  on public.aeromind_notification_campaigns(status,scheduled_at);
create index if not exists aeromind_notification_deliveries_user_idx
  on public.aeromind_notification_deliveries(user_id,published_at desc);
create index if not exists aeromind_notification_deliveries_campaign_idx
  on public.aeromind_notification_deliveries(campaign_id,read_at);

alter table public.aeromind_notification_campaigns enable row level security;
alter table public.aeromind_notification_deliveries enable row level security;
revoke all on public.aeromind_notification_campaigns from public,anon,authenticated;
revoke all on public.aeromind_notification_deliveries from public,anon,authenticated;
grant select,insert,update,delete on public.aeromind_notification_campaigns to authenticated;
grant select on public.aeromind_notification_deliveries to authenticated;

drop policy if exists aeromind_notification_campaign_staff on public.aeromind_notification_campaigns;
create policy aeromind_notification_campaign_staff
  on public.aeromind_notification_campaigns for all to authenticated
  using ((select private.aeromind_verified_staff()))
  with check ((select private.aeromind_verified_staff()));
drop policy if exists aeromind_notification_delivery_self on public.aeromind_notification_deliveries;
create policy aeromind_notification_delivery_self
  on public.aeromind_notification_deliveries for select to authenticated
  using (user_id=(select auth.uid()));
drop policy if exists aeromind_notification_delivery_staff on public.aeromind_notification_deliveries;
create policy aeromind_notification_delivery_staff
  on public.aeromind_notification_deliveries for select to authenticated
  using ((select private.aeromind_verified_staff()));

-- Funções internas não podem ser chamadas pelo navegador.
create or replace function private.aeromind_publish_campaign_internal(p_campaign_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
declare
 c public.aeromind_notification_campaigns%rowtype;
 n integer;
begin
 select * into c from public.aeromind_notification_campaigns
  where id=p_campaign_id for update;
 if not found then raise exception 'Campanha não encontrada'; end if;
 if c.status not in ('draft','template','scheduled') then
   raise exception 'Campanha já enviada ou cancelada'; end if;
 if not c.channel_site then
   raise exception 'Ative o canal Site para publicar'; end if;

 insert into public.aeromind_notification_deliveries
 (campaign_id,user_id,title,body,category,priority,cta_label,cta_path,published_at,expires_at)
 select c.id,u.id,c.title,c.body,c.category,c.priority,c.cta_label,c.cta_path,
    now(),case when c.validity_minutes is null then null
       else now()+make_interval(mins => c.validity_minutes) end
 from auth.users u
 where u.email_confirmed_at is not null
 and (
   c.audience_type = 'all'
   or (c.audience_type='user' and u.id=c.audience_user_id)
   or (c.audience_type in ('active','tier') and exists (
       select 1 from public.licenses l
        where l.user_id=u.id and l.status='active'
        and l.valid_until>now()
        and (c.audience_type='active' or l.plan_name=c.audience_tier)
   ))
 )
 on conflict(campaign_id,user_id) do nothing;
 get diagnostics n=row_count;
 if n=0 then raise exception 'Nenhum destinatário elegível. Confira o público selecionado.'; end if;
 update public.aeromind_notification_campaigns set
   status='sent',sent_at=now(),recipient_count=n,updated_at=now()
   where id=c.id;
 return n;
end;
$$;
revoke all on function private.aeromind_publish_campaign_internal(uuid) from public,anon,authenticated;

create or replace function public.aeromind_admin_send_campaign(p_campaign_id uuid)
returns integer language plpgsql security definer set search_path='' as $$
begin
 if not private.aeromind_verified_staff() then
  raise exception 'Acesso administrativo necessário' using errcode='42501';
 end if;
 return private.aeromind_publish_campaign_internal(p_campaign_id);
end;
$$;
revoke all on function public.aeromind_admin_send_campaign(uuid) from public,anon,authenticated;
grant execute on function public.aeromind_admin_send_campaign(uuid) to authenticated;

create or replace function public.aeromind_mark_notification_read(p_delivery_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then
  raise exception 'Autenticação necessária' using errcode='42501'; end if;
 update public.aeromind_notification_deliveries d
 set read_at=coalesce(d.read_at,now())
 where d.id=p_delivery_id and d.user_id=auth.uid();
 return found;
end;
$$;
revoke all on function public.aeromind_mark_notification_read(uuid) from public,anon,authenticated;
grant execute on function public.aeromind_mark_notification_read(uuid) to authenticated;

create or replace function private.aeromind_process_scheduled_campaigns()
returns void language plpgsql security definer set search_path='' as $$
declare entry record;
begin
 for entry in
  select id from public.aeromind_notification_campaigns
  where status='scheduled' and scheduled_at<=now()
  order by scheduled_at asc limit 30
 loop
   begin
     perform private.aeromind_publish_campaign_internal(entry.id);
   exception when others then
     raise warning 'AeroMind notification %: %',entry.id,sqlerrm;
   end;
 end loop;
end;
$$;
revoke all on function private.aeromind_process_scheduled_campaigns() from public,anon,authenticated;

-- Executa envios agendados em até ~1 minuto, sem chamadas HTTP ou segredos.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('aeromind_notifications_due_v1','* * * * *',
  'select private.aeromind_process_scheduled_campaigns();');
