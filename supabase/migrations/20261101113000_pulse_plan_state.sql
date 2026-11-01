-- Aurora Pulse v11: authenticated plan presentation read endpoint.
-- Live database already migrated; commit records exact versioned schema.
CREATE OR REPLACE FUNCTION public.aeromind_pulse_my_plan_state()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $body$
DECLARE
 who uuid := auth.uid();
 lic record;
 valid_lic boolean := false;
 resolved_tier text := 'none';
 display_plan text := 'Sem licença ativa';
 upcoming_limit integer := 0;
 theme_color text := '#64748B';
 full_schedule boolean := false;
 stamp text;
BEGIN
 IF who IS NULL THEN RAISE EXCEPTION 'Entre na sua conta' USING ERRCODE='42501'; END IF;
 SELECT l.id,l.plan_name,l.status,l.valid_until
 INTO lic FROM public.licenses l WHERE l.user_id=who
 ORDER BY (l.status='active' AND l.valid_until>clock_timestamp()) DESC,l.created_at DESC,l.id DESC LIMIT 1;
 IF FOUND THEN
   valid_lic := lic.status='active' AND lic.valid_until>clock_timestamp();
   IF valid_lic THEN
     CASE lic.plan_name
       WHEN 'Básico' THEN resolved_tier:='basico';display_plan:='Básico';upcoming_limit:=3;theme_color:='#38BDF8';
       WHEN 'Pro' THEN resolved_tier:='pro';display_plan:='Pro';upcoming_limit:=5;theme_color:='#A855F7';
       WHEN 'Ultra' THEN resolved_tier:='gold';display_plan:='Gold';upcoming_limit:=7;theme_color:='#F5B942';full_schedule:=true;
       ELSE resolved_tier:='none';display_plan:='Plano não reconhecido';
     END CASE;
   END IF;
 END IF;
 stamp:=md5(coalesce(lic.id::text,'none')||'|'||coalesce(lic.plan_name,'')||'|'||
           coalesce(lic.status,'')||'|'||coalesce(lic.valid_until::text,'')||'|'||
           CASE WHEN valid_lic THEN '1' ELSE '0' END);
 RETURN jsonb_build_object(
   'ok',true,'active',valid_lic,'tier',resolved_tier,'display_plan',display_plan,
   'revision',stamp,'valid_until',CASE WHEN valid_lic THEN lic.valid_until ELSE NULL END,
   'upcoming_signal_count',upcoming_limit,'upcoming_signals_color',theme_color,
   'can_view_full_schedule',full_schedule,
   'gold_experimental_entitlements_unchanged',true);
END;
$body$;
REVOKE ALL ON FUNCTION public.aeromind_pulse_my_plan_state() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aeromind_pulse_my_plan_state() TO authenticated;