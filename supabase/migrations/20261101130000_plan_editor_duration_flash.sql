-- AeroMind plans: editable commercial durations, real-expiry flash offers and audited paid-license extensions.
alter table public.aeromind_plan_catalog
 add column if not exists flash_price_cents integer,
 add column if not exists flash_ends_at timestamptz,
 add column if not exists flash_label text;
alter table public.aeromind_plan_catalog drop constraint if exists aeromind_plan_catalog_duration_days_check;
alter table public.aeromind_plan_catalog add constraint aeromind_plan_catalog_duration_days_check
 check(
  (slug='teste-horas' and duration_days=1 and trial_quantity between 1 and 72)
  or (slug='teste-dias' and duration_days=2 and trial_quantity between 1 and 30)
  or (slug not in ('teste-horas','teste-dias') and duration_days between 1 and 730 and trial_quantity is null)
 );
alter table public.aeromind_plan_catalog drop constraint if exists aeromind_flash_offer_valid;
alter table public.aeromind_plan_catalog add constraint aeromind_flash_offer_valid check (
  (flash_price_cents is null and flash_ends_at is null and flash_label is null)
  or (flash_price_cents between 200 and price_cents and flash_ends_at is not null
      and length(coalesce(flash_label,''))<=48 and price_cents is not null)
 );

create table if not exists private.aeromind_plan_duration_sync (
 license_id uuid not null references public.licenses(id) on delete cascade,
 plan_slug text not null references public.aeromind_plan_catalog(slug),
 applied_days integer not null default 0 check(applied_days>=0),
 primary key(license_id,plan_slug)
);
revoke all on private.aeromind_plan_duration_sync from public,anon,authenticated;

create table if not exists public.aeromind_plan_edit_audit (
 id bigint generated always as identity primary key,
 plan_slug text not null references public.aeromind_plan_catalog(slug),
 actor_id uuid,
 before_data jsonb not null,
 after_data jsonb not null,
 extended_licenses integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.aeromind_plan_edit_audit enable row level security;
revoke all on public.aeromind_plan_edit_audit from public,anon,authenticated;
grant select on public.aeromind_plan_edit_audit to authenticated;
drop policy if exists aeromind_plan_edit_audit_staff on public.aeromind_plan_edit_audit;
create policy aeromind_plan_edit_audit_staff on public.aeromind_plan_edit_audit
 for select to authenticated using (private.aeromind_verified_staff());

create or replace function public.aeromind_admin_all_plans() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not private.aeromind_verified_staff() then raise exception 'Administração necessária' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(p) order by p.tier,p.duration_days) from
  (select slug,tier,duration_days,trial_quantity,price_cents,visible,marketing_title,
    marketing_description,marketing_badge,marketing_features,marketing_cta,marketing_highlight,
    marketing_duration_caption,marketing_unpriced_label,flash_price_cents,flash_ends_at,flash_label
    from public.aeromind_plan_catalog) p),'[]'::jsonb);
end $$;
revoke all on function public.aeromind_admin_all_plans() from public,anon;
grant execute on function public.aeromind_admin_all_plans() to authenticated;

create or replace function public.aeromind_save_plan_editor_v3(
 p_slug text,p_price_cents integer,p_visible boolean,p_trial_quantity integer,
 p_title text,p_description text,p_badge text,p_features text[],p_cta text,
 p_highlight boolean,p_duration_caption text,p_unpriced_label text,
 p_duration_days integer,p_flash_price_cents integer,p_flash_ends_at timestamptz,p_flash_label text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare old_plan public.aeromind_plan_catalog%rowtype; new_plan jsonb;
 v_trial boolean; v_changed integer:=0; v_goal integer;
 rec record; previous_days integer; extension_days integer;
begin
 if not private.aeromind_verified_staff() then raise exception 'Somente a administração pode editar planos' using errcode='42501'; end if;
 if p_slug is null or p_slug !~ '^((basico|pro|ultra)-(mensal|trimestral|semestral|anual)|teste-(horas|dias))$'
 then raise exception 'Plano inválido' using errcode='22023'; end if;
 v_trial:=p_slug in ('teste-horas','teste-dias');
 if (p_price_cents is not null and (p_price_cents<0 or p_price_cents>100000000))
 or (coalesce(p_visible,false) and (p_price_cents is null or (p_price_cents<200 and not (v_trial and p_price_cents=0))))
 or (not v_trial and p_price_cents=0)
 or (v_trial and (p_trial_quantity is null or p_trial_quantity<1 or
     (p_slug='teste-horas' and p_trial_quantity>72) or (p_slug='teste-dias' and p_trial_quantity>30)))
 or (not v_trial and p_trial_quantity is not null)
 or (not v_trial and (p_duration_days is null or p_duration_days not between 1 and 730))
 or length(coalesce(p_title,''))>65 or length(coalesce(p_description,''))>240
 or length(coalesce(p_badge,''))>38 or length(coalesce(p_cta,''))>40
 or length(coalesce(p_duration_caption,''))>80
 or length(coalesce(p_unpriced_label,''))>40
 or coalesce(array_length(p_features,1),0)>8
 or exists(select 1 from unnest(coalesce(p_features,ARRAY[]::text[])) f where length(f)>115)
 or ((p_flash_price_cents is null) <> (p_flash_ends_at is null))
 or (p_flash_price_cents is not null and
    (v_trial or p_price_cents is null or p_flash_price_cents < 200
     or p_flash_price_cents>=p_price_cents or length(coalesce(p_flash_label,''))>48))
 then raise exception 'Configuração inválida' using errcode='22023'; end if;
 select * into old_plan from public.aeromind_plan_catalog where slug=p_slug for update;
 if not found then return jsonb_build_object('ok',false,'code','not-found'); end if;
 update public.aeromind_plan_catalog set
  price_cents=p_price_cents,visible=coalesce(p_visible,false),
  duration_days=case when v_trial then old_plan.duration_days else p_duration_days end,
  trial_quantity=case when v_trial then p_trial_quantity else null end,
  marketing_title=nullif(btrim(p_title),''),
  marketing_description=nullif(btrim(p_description),''),
  marketing_badge=nullif(btrim(p_badge),''),
  marketing_features=coalesce(p_features,ARRAY[]::text[]),
  marketing_cta=nullif(btrim(p_cta),''),
  marketing_highlight=coalesce(p_highlight,false),
  marketing_duration_caption=nullif(btrim(p_duration_caption),''),
  marketing_unpriced_label=nullif(btrim(p_unpriced_label),''),
  flash_price_cents=p_flash_price_cents,
  flash_ends_at=p_flash_ends_at,
  flash_label=case when p_flash_price_cents is null then null else nullif(btrim(p_flash_label),'') end,
  updated_at=now()
 where slug=p_slug returning to_jsonb(public.aeromind_plan_catalog.*) into new_plan;
 -- Existing paid purchases retain their agreed term. Only additional days are granted,
 -- using the original paid order as the baseline and recording every extension once.
 if not v_trial and p_duration_days>old_plan.duration_days then
  for rec in
   select l.id,l.user_id,l.valid_until,
    (select o.duration_days from public.aeromind_payment_orders o
     where o.user_id=l.user_id and o.plan_slug=p_slug and o.status='paid'
     order by o.paid_at desc nulls last,o.created_at desc limit 1) original_days
   from public.licenses l
   where l.plan_name=old_plan.tier and l.status='active' and l.valid_until>now()
     and exists(select 1 from public.aeromind_payment_orders o
       where o.user_id=l.user_id and o.plan_slug=p_slug and o.status='paid')
   for update of l
  loop
   select coalesce(s.applied_days,0) into previous_days
    from private.aeromind_plan_duration_sync s where s.license_id=rec.id and s.plan_slug=p_slug;
   extension_days:=greatest(0,p_duration_days-rec.original_days-coalesce(previous_days,0));
   if extension_days>0 then
    update public.licenses set valid_until=valid_until+make_interval(days=>extension_days) where id=rec.id;
    insert into private.aeromind_plan_duration_sync(license_id,plan_slug,applied_days)
    values(rec.id,p_slug,coalesce(previous_days,0)+extension_days)
    on conflict(license_id,plan_slug) do update set applied_days=excluded.applied_days;
    v_changed:=v_changed+1;
   end if;
  end loop;
 end if;
 insert into public.aeromind_plan_edit_audit(plan_slug,actor_id,before_data,after_data,extended_licenses)
 values(p_slug,auth.uid(),to_jsonb(old_plan),new_plan,v_changed);
 return jsonb_build_object('ok',true,'extended_licenses',v_changed);
end $$;
revoke all on function public.aeromind_save_plan_editor_v3(
 text,integer,boolean,integer,text,text,text,text[],text,boolean,text,text,integer,integer,timestamptz,text
) from public,anon,authenticated;
grant execute on function public.aeromind_save_plan_editor_v3(
 text,integer,boolean,integer,text,text,text,text[],text,boolean,text,text,integer,integer,timestamptz,text
) to authenticated;

-- Real offer price must be applied to the amount persisted in the order,
-- not merely displayed in the frontend.
create or replace function private.aeromind_create_pix_order(p_slug text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_user uuid:=auth.uid();
 v_plan public.aeromind_plan_catalog%rowtype;
 v_existing public.aeromind_payment_orders%rowtype;
 v_id uuid:=gen_random_uuid();
 v_count int;
 v_minutes int;
 v_price int;
begin
 if v_user is null or not exists(select 1 from auth.users where id=v_user and email_confirmed_at is not null)
 then raise exception 'Faça login e confirme seu e-mail' using errcode='42501'; end if;
 if p_slug is null or p_slug !~ '^((basico|pro|ultra)-(mensal|trimestral|semestral|anual)|teste-(horas|dias))$'
 then raise exception 'Plano inválido' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtext(v_user::text));
 select * into v_existing from public.aeromind_payment_orders
 where user_id=v_user and status in ('created','pending') order by created_at desc limit 1 for update;
 if found then
  if v_existing.plan_slug<>p_slug then
   raise exception 'Já existe uma cobrança aberta de outro plano. Consulte seus pedidos ou o suporte.' using errcode='22023';
  end if;
  return jsonb_build_object('order_id',v_existing.id,'reference_id',v_existing.reference_id,
   'amount_cents',v_existing.amount_cents,'plan',v_existing.plan_name,
   'duration_days',v_existing.duration_days,'duration_minutes',v_existing.duration_minutes,'reused',true);
 end if;
 select * into v_plan from public.aeromind_plan_catalog
 where slug=p_slug and visible=true and price_cents>=200;
 if not found then raise exception 'Plano não disponível para Pix inferior a R$ 2,00' using errcode='22023'; end if;
 v_price:=case when v_plan.flash_price_cents is not null and v_plan.flash_ends_at>now()
  then v_plan.flash_price_cents else v_plan.price_cents end;
 v_minutes:=case when v_plan.slug='teste-horas' then v_plan.trial_quantity*60
                 when v_plan.slug='teste-dias' then v_plan.trial_quantity*1440
                 else v_plan.duration_days*1440 end;
 if v_minutes is null or v_minutes<60 or v_minutes>1051200
 then raise exception 'Prazo inválido' using errcode='22023'; end if;
 select count(*) into v_count from public.aeromind_payment_orders
 where user_id=v_user and created_at>now()-interval '1 hour';
 if v_count>=4 then raise exception 'Aguarde antes de gerar outra cobrança' using errcode='22023'; end if;
 insert into public.aeromind_payment_orders
 (id,reference_id,user_id,plan_slug,plan_name,duration_days,duration_minutes,amount_cents)
 values(v_id,'aeromind-'||v_id::text,v_user,v_plan.slug,v_plan.tier,
 v_plan.duration_days,v_minutes,v_price);
 return jsonb_build_object('order_id',v_id,'reference_id','aeromind-'||v_id::text,
 'amount_cents',v_price,'plan',v_plan.tier,'duration_days',v_plan.duration_days,
 'duration_minutes',v_minutes,'reused',false);
end $$;
