-- Ajuste aditivo da função publicada: alias explícito na cláusula RETURNING.
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
