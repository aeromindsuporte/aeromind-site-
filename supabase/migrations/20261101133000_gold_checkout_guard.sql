-- Do not sell the Gold draft before the separate rollout unlocks checkout.
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
 where slug=p_slug and visible=true and price_cents>=200
  and (tier<>'Ultra' or exists (
   select 1 from private.aeromind_gold_rollout r
   where r.singleton=true and r.enabled=true and r.checkout_enabled=true
  ));
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
