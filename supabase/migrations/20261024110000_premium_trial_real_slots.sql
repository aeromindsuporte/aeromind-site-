-- Lote REAL de 12 ativações para o teste gratuito de 1h, como aprovado.
-- Nunca simular decrementos no navegador: a redução é transacional e acompanha licenças efetivas.
create table if not exists public.aeromind_free_trial_batches (
  plan_slug text primary key references public.aeromind_plan_catalog(slug),
  capacity integer not null check (capacity between 0 and 1000000),
  remaining integer not null check (remaining >= 0 and remaining <= capacity),
  enabled boolean not null default true,
  opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.aeromind_free_trial_batches enable row level security;
revoke all on table public.aeromind_free_trial_batches from public, anon, authenticated;
-- Sem claims anteriores para teste-horas no início deste lote; já existentes em lote anterior
-- não consomem slots adicionais. O insert idempotente não redefine lotes futuros.
insert into public.aeromind_free_trial_batches(plan_slug,capacity,remaining,enabled)
values ('teste-horas',12,12,true)
on conflict (plan_slug) do nothing;

-- No catálogo, Premium é a apresentação comercial do acesso técnico Pro.
-- O SQL acompanha a UI: ativar este teste gera uma licença de nível Pro, não Básico.
update public.aeromind_plan_catalog
set tier='Pro',
    marketing_title='Teste Grátis',
    marketing_description='Experimente os recursos Premium pelo período escolhido',
    marketing_features=array['Monitoramento Premium','Histórico do aplicativo','Acesso por tempo definido']::text[],
    marketing_cta='Garantir teste grátis agora',
    updated_at=now()
where slug='teste-horas' and price_cents=0;

-- Contador público somente leitura. Ausência de plano publicado/gratuito retorna NULL.
create or replace function public.aeromind_public_free_trial_slots(p_slug text)
returns integer
language sql stable
security definer
set search_path to ''
as $$
  select case when b.enabled then b.remaining else 0 end
  from public.aeromind_free_trial_batches b
  join public.aeromind_plan_catalog p on p.slug=b.plan_slug
  where b.plan_slug=p_slug and p.visible=true and p.price_cents=0
    and p.slug in ('teste-horas','teste-dias')
  limit 1;
$$;
revoke all on function public.aeromind_public_free_trial_slots(text) from public;
grant execute on function public.aeromind_public_free_trial_slots(text) to anon, authenticated;

-- Preserva todas as regras anteriores e debita exatamente 1 vaga ao criar 1 licença real.
-- O débito e as inserções ocorrem na MESMA transação; falhas fazem rollback completo.
create or replace function public.aeromind_claim_free_trial(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
 v_user uuid:=auth.uid();
 v_plan public.aeromind_plan_catalog%rowtype;
 v_license uuid;
 v_until timestamptz;
 v_minutes integer;
 v_batch_slug text;
begin
 if auth.role()<>'authenticated' or v_user is null
  or not exists(select 1 from auth.users u where u.id=v_user and u.email_confirmed_at is not null)
 then
  raise exception 'Confirme seu e-mail antes de ativar o teste.' using errcode='42501';
 end if;
 if p_slug not in ('teste-horas','teste-dias') or p_slug is null then
  raise exception 'Tipo de teste não autorizado.' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtext(v_user::text));
 select * into v_plan from public.aeromind_plan_catalog
 where slug=p_slug and visible=true and price_cents=0 for share;
 if not found then
  raise exception 'Teste gratuito indisponível no momento.' using errcode='22023';
 end if;
 if exists(select 1 from public.aeromind_free_trial_claims where user_id=v_user) then
  raise exception 'Esta conta já utilizou seu teste gratuito.' using errcode='22023';
 end if;
 if exists(select 1 from public.licenses where user_id=v_user) or
    exists(select 1 from public.aeromind_payment_orders where user_id=v_user and status='paid') then
  raise exception 'Esta conta já possui histórico de licenças. Consulte sua área do cliente.' using errcode='22023';
 end if;
 v_minutes:=case when p_slug='teste-horas' then v_plan.trial_quantity*60
                 else v_plan.trial_quantity*1440 end;
 if v_minutes is null or v_minutes<60 or v_minutes>43200 then
  raise exception 'Prazo de teste inválido' using errcode='22023';
 end if;

 if exists(select 1 from public.aeromind_free_trial_batches where plan_slug=p_slug) then
  update public.aeromind_free_trial_batches
     set remaining=remaining-1,updated_at=now()
   where plan_slug=p_slug and enabled=true and remaining>0
   returning plan_slug into v_batch_slug;
  if v_batch_slug is null then
   raise exception 'Vagas do teste gratuito esgotadas.' using errcode='22023';
  end if;
 end if;

 v_until:=now()+make_interval(mins=>v_minutes);
 insert into public.licenses(user_id,plan_name,status,valid_until)
 values(v_user,v_plan.tier,'active',v_until) returning id into v_license;
 insert into public.aeromind_free_trial_claims(user_id,plan_slug,license_id)
 values(v_user,p_slug,v_license);
 return jsonb_build_object('activated',true,'valid_until',v_until,'plan_slug',p_slug);
end
$function$;
revoke all on function public.aeromind_claim_free_trial(text) from public, anon;
grant execute on function public.aeromind_claim_free_trial(text) to authenticated;
