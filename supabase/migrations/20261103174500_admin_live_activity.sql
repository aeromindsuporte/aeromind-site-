-- AeroMind live admin activity: signups, trial CTA clicks and actual activations.
-- Independent from customer-facing notification campaigns.
CREATE TABLE IF NOT EXISTS public.aeromind_admin_activity_events (
  id bigint generated always as identity PRIMARY KEY,
  event_type text NOT NULL CHECK (event_type IN ('signup','trial_click','trial_activated')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text CHECK (email IS NULL OR length(email)<=320),
  plan_slug text CHECK (plan_slug IS NULL OR plan_slug IN ('teste-horas','teste-dias')),
  visit_key uuid,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS aeromind_admin_activity_latest_idx
 ON public.aeromind_admin_activity_events(occurred_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS aeromind_admin_activity_trial_throttle_idx
 ON public.aeromind_admin_activity_events(visit_key,plan_slug,occurred_at DESC)
 WHERE event_type='trial_click';
CREATE UNIQUE INDEX IF NOT EXISTS aeromind_admin_activity_unique_account_idx
 ON public.aeromind_admin_activity_events(event_type,user_id)
 WHERE user_id IS NOT NULL AND event_type IN ('signup','trial_activated');

CREATE TABLE IF NOT EXISTS public.aeromind_admin_activity_cursors (
 admin_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 last_seen_at timestamptz NOT NULL DEFAULT 'epoch'::timestamptz
);
ALTER TABLE public.aeromind_admin_activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aeromind_admin_activity_cursors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aeromind_admin_activity_events FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.aeromind_admin_activity_cursors FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.aeromind_admin_activity_events TO authenticated;
GRANT SELECT ON public.aeromind_admin_activity_cursors TO authenticated;
CREATE POLICY aeromind_activity_staff_read ON public.aeromind_admin_activity_events
 FOR SELECT TO authenticated USING ((SELECT private.aeromind_verified_staff()));
CREATE POLICY aeromind_activity_cursor_self ON public.aeromind_admin_activity_cursors
 FOR SELECT TO authenticated USING (admin_id=(SELECT auth.uid()) AND (SELECT private.aeromind_verified_staff()));

-- Marking all as read only changes the current, verified staff member's cursor.
CREATE OR REPLACE FUNCTION public.aeromind_admin_activity_mark_seen()
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE stamp timestamptz:=clock_timestamp();
BEGIN
 IF NOT private.aeromind_verified_staff() THEN
  RAISE EXCEPTION 'Acesso administrativo negado' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.aeromind_admin_activity_cursors(admin_id,last_seen_at)
 VALUES(auth.uid(),stamp)
 ON CONFLICT(admin_id) DO UPDATE SET last_seen_at=greatest(
  public.aeromind_admin_activity_cursors.last_seen_at,excluded.last_seen_at);
 RETURN stamp;
END $$;
REVOKE ALL ON FUNCTION public.aeromind_admin_activity_mark_seen() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.aeromind_admin_activity_mark_seen() TO authenticated;

-- Scoped anonymous tracking, emitted only when the website's Test CTA is used.
-- 1 event per stable visitor cookie and plan per 20 minutes; no IP is stored.
CREATE OR REPLACE FUNCTION public.aeromind_record_trial_click(p_slug text,p_visit_key uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who uuid:=auth.uid(); who_email text;
BEGIN
 IF p_slug IS NULL OR p_slug NOT IN ('teste-horas','teste-dias') OR p_visit_key IS NULL THEN
  RETURN false;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_visit_key::text,41701));
 IF EXISTS(
  SELECT 1 FROM public.aeromind_admin_activity_events e
   WHERE e.event_type='trial_click' AND e.visit_key=p_visit_key
     AND e.plan_slug=p_slug AND e.occurred_at>clock_timestamp()-interval '20 minutes'
 ) THEN RETURN false; END IF;
 IF who IS NOT NULL THEN
  SELECT email INTO who_email FROM auth.users WHERE id=who;
 END IF;
 INSERT INTO public.aeromind_admin_activity_events(event_type,user_id,email,plan_slug,visit_key)
 VALUES('trial_click',who,who_email,p_slug,p_visit_key);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.aeromind_record_trial_click(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.aeromind_record_trial_click(text,uuid) TO anon,authenticated;

-- Trigger-based events are recorded at the actual database transaction, not browser polling.
CREATE OR REPLACE FUNCTION private.aeromind_admin_log_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.aeromind_admin_activity_events(event_type,user_id,email,occurred_at)
 VALUES('signup',NEW.id,NEW.email,NEW.created_at)
 ON CONFLICT DO NOTHING;
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN
 RAISE WARNING 'AeroMind signup activity unavailable: %',SQLSTATE;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.aeromind_admin_log_signup() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS on_aeromind_admin_signup_activity ON auth.users;
CREATE TRIGGER on_aeromind_admin_signup_activity
 AFTER INSERT ON auth.users FOR EACH ROW
 EXECUTE FUNCTION private.aeromind_admin_log_signup();

CREATE OR REPLACE FUNCTION private.aeromind_admin_log_trial_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE who_email text;
BEGIN
 SELECT email INTO who_email FROM auth.users WHERE id=NEW.user_id;
 INSERT INTO public.aeromind_admin_activity_events(event_type,user_id,email,plan_slug,occurred_at)
 VALUES('trial_activated',NEW.user_id,who_email,NEW.plan_slug,NEW.granted_at)
 ON CONFLICT DO NOTHING;
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN
 RAISE WARNING 'AeroMind trial activation activity unavailable: %',SQLSTATE;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.aeromind_admin_log_trial_activation() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS on_aeromind_admin_trial_activation ON public.aeromind_free_trial_claims;
CREATE TRIGGER on_aeromind_admin_trial_activation
 AFTER INSERT ON public.aeromind_free_trial_claims FOR EACH ROW
 EXECUTE FUNCTION private.aeromind_admin_log_trial_activation();

-- Realtime only emits rows a staff user's authenticated JWT is allowed to SELECT.
ALTER PUBLICATION supabase_realtime ADD TABLE public.aeromind_admin_activity_events;