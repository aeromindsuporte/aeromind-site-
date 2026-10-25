-- Visitantes anônimos não consultam aeromind_staff nem dependem de suas permissões.
drop policy if exists aeromind_campaign_public_or_staff on public.aeromind_tier_campaigns;
create policy aeromind_campaign_public_visible on public.aeromind_tier_campaigns
 for select to anon,authenticated using (visible=true);

-- Administradores veem campanhas publicadas e rascunhos por uma RPC auditável.
create or replace function public.aeromind_admin_campaigns()
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if actor is null or not exists(
  select 1 from public.aeromind_staff s where s.user_id=actor and s.role in ('admin','owner')
 ) then raise exception 'Acesso negado' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(c) - 'updated_by' order by c.tier),'[]'::jsonb)
 into result from public.aeromind_tier_campaigns c;
 return result;
end $$;
revoke all on function public.aeromind_admin_campaigns() from public,anon,authenticated;
grant execute on function public.aeromind_admin_campaigns() to authenticated;
