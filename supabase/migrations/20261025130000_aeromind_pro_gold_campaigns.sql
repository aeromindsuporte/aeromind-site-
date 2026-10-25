-- Divulgação controlada Pro/Gold; não altera preços, licenças nem checkout.
create table if not exists public.aeromind_tier_campaigns (
 tier text primary key check(tier in ('Pro','Gold')),
 visible boolean not null default false,
 eyebrow text not null check(char_length(eyebrow) between 3 and 65),
 headline text not null check(char_length(headline) between 5 and 110),
 description text not null check(char_length(description) between 15 and 400),
 badge text not null check(char_length(badge) between 3 and 65),
 cta_text text not null check(char_length(cta_text) between 3 and 55),
 features jsonb not null check(jsonb_typeof(features)='array' and jsonb_array_length(features) between 2 and 6),
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default clock_timestamp()
);
alter table public.aeromind_tier_campaigns enable row level security;
revoke all on public.aeromind_tier_campaigns from public,anon,authenticated;
grant select on public.aeromind_tier_campaigns to anon,authenticated;
create policy aeromind_campaign_public_visible on public.aeromind_tier_campaigns
 for select to anon,authenticated using (visible=true);
insert into public.aeromind_tier_campaigns(tier,visible,eyebrow,headline,description,badge,cta_text,features)
values
 ('Pro',true,'AEROMIND PRO','Mais recursos para acompanhar cada sessão',
  'Conheça o Pro e os recursos ampliados planejados para o AeroMind Aurora. A liberação depende da publicação de uma oferta e da atualização compatível do aplicativo.',
  'PRO · EXPERIÊNCIA AMPLIADA','Conhecer o Pro',
  '["Monitor e indicadores preservados","Radar Rosa V4 — AMPLIADO 5 no Aurora","Acesso aos recursos atuais conforme licença","Histórico e acompanhamento das sessões"]'::jsonb),
 ('Gold',true,'AEROMIND GOLD','Uma nova camada de análise profissional',
  'O AeroMind Gold está sendo preparado para o Aurora, com o Radar EXPANDIDO 7, modos Rosa 10x de 2 e 8 observações e relatórios separados. Sem contratação disponível neste momento.',
  'GOLD · LANÇAMENTO EM PREPARAÇÃO','Conhecer o Gold',
  '["Radar Rosa V4 — EXPANDIDO 7 no Aurora","Rosa 10x — 2 observações (experimental)","Rosa 10x — 8 observações (experimental)","Históricos e placares segregados","Ferramentas avançadas de monitoramento"]'::jsonb)
on conflict (tier) do nothing;

create table if not exists public.aeromind_tier_campaign_audit (
 id bigint generated always as identity primary key,
 tier text not null check(tier in ('Pro','Gold')),
 before_state jsonb,
 after_state jsonb not null,
 changed_by uuid references auth.users(id) on delete set null,
 reason text not null check(char_length(reason) between 8 and 350),
 created_at timestamptz not null default clock_timestamp()
);
create index if not exists campaign_audit_recent on public.aeromind_tier_campaign_audit(created_at desc);
alter table public.aeromind_tier_campaign_audit enable row level security;
revoke all on public.aeromind_tier_campaign_audit from public,anon,authenticated;
grant select on public.aeromind_tier_campaign_audit to authenticated;
create policy aeromind_campaign_audit_staff on public.aeromind_tier_campaign_audit
 for select to authenticated using (
 exists(select 1 from public.aeromind_staff s where s.user_id=(select auth.uid()) and s.role in ('admin','owner'))
);

create or replace function public.aeromind_admin_save_tier_campaign(
 p_tier text,p_visible boolean,p_eyebrow text,p_headline text,p_description text,
 p_badge text,p_cta_text text,p_features jsonb,p_reason text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); old_state jsonb; new_state jsonb; feature jsonb;
begin
 if actor is null or not exists(select 1 from public.aeromind_staff s where s.user_id=actor and s.role in ('admin','owner'))
  then raise exception 'Acesso negado' using errcode='42501'; end if;
 if p_tier is null or p_tier not in ('Pro','Gold') or p_visible is null
 or p_eyebrow is null or char_length(btrim(p_eyebrow)) not between 3 and 65
 or p_headline is null or char_length(btrim(p_headline)) not between 5 and 110
 or p_description is null or char_length(btrim(p_description)) not between 15 and 400
 or p_badge is null or char_length(btrim(p_badge)) not between 3 and 65
 or p_cta_text is null or char_length(btrim(p_cta_text)) not between 3 and 55
 or p_reason is null or char_length(btrim(p_reason)) not between 8 and 350
 or p_features is null or jsonb_typeof(p_features)<>'array'
 or jsonb_array_length(p_features) not between 2 and 6
 then raise exception 'Divulgação inválida' using errcode='22023'; end if;
 for feature in select value from jsonb_array_elements(p_features) loop
  if jsonb_typeof(feature)<>'string' or char_length(btrim(feature#>>'{}')) not between 5 and 130
   then raise exception 'Benefício inválido' using errcode='22023'; end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(p_tier,92525));
 select to_jsonb(c) - 'updated_by' into old_state
 from public.aeromind_tier_campaigns c where c.tier=p_tier for update;
 update public.aeromind_tier_campaigns as c set
  visible=p_visible,eyebrow=btrim(p_eyebrow),headline=btrim(p_headline),
  description=btrim(p_description),badge=btrim(p_badge),cta_text=btrim(p_cta_text),
  features=p_features,updated_by=actor,updated_at=clock_timestamp()
 where c.tier=p_tier returning to_jsonb(c)-'updated_by' into new_state;
 if not found then raise exception 'Campanha inexistente' using errcode='22023'; end if;
 insert into public.aeromind_tier_campaign_audit(tier,before_state,after_state,changed_by,reason)
 values(p_tier,old_state,new_state,actor,btrim(p_reason));
 return jsonb_build_object('ok',true,'tier',p_tier,'published',p_visible);
end $$;
revoke all on function public.aeromind_admin_save_tier_campaign(text,boolean,text,text,text,text,text,jsonb,text)
 from public,anon,authenticated;
grant execute on function public.aeromind_admin_save_tier_campaign(text,boolean,text,text,text,text,text,jsonb,text)
 to authenticated;
