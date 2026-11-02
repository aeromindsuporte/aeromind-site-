-- AeroMind • Central de sugestões, feedback e melhorias (2026-11-02).
-- Clientes autenticados acessam somente as próprias contribuições; staff pode triar.
CREATE TABLE IF NOT EXISTS public.aeromind_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 category text NOT NULL CHECK (category IN ('melhoria','problema','elogio','outro')),
 title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 5 AND 110),
 message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 15 AND 2000),
 rating smallint NULL CHECK (rating BETWEEN 1 AND 5),
 status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','em_analise','planejado','implementado','arquivado')),
 admin_reply text NULL CHECK (admin_reply IS NULL OR char_length(admin_reply) <= 1200),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aeromind_feedback_user_recent_idx ON public.aeromind_feedback(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS aeromind_feedback_status_recent_idx ON public.aeromind_feedback(status,created_at DESC);
ALTER TABLE public.aeromind_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.aeromind_feedback FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.aeromind_feedback TO authenticated;
GRANT INSERT(user_id,category,title,message,rating) ON public.aeromind_feedback TO authenticated;
GRANT UPDATE(status,admin_reply) ON public.aeromind_feedback TO authenticated;

DROP POLICY IF EXISTS aeromind_feedback_read ON public.aeromind_feedback;
CREATE POLICY aeromind_feedback_read ON public.aeromind_feedback
 FOR SELECT TO authenticated
 USING (
  user_id=(SELECT auth.uid())
  OR EXISTS (
   SELECT 1 FROM public.aeromind_staff s
   WHERE s.user_id=(SELECT auth.uid()) AND s.role IN ('owner','admin')
  )
 );

DROP POLICY IF EXISTS aeromind_feedback_insert ON public.aeromind_feedback;
CREATE POLICY aeromind_feedback_insert ON public.aeromind_feedback
 FOR INSERT TO authenticated
 WITH CHECK (user_id=(SELECT auth.uid()) AND status='novo' AND admin_reply IS NULL);

DROP POLICY IF EXISTS aeromind_feedback_staff_update ON public.aeromind_feedback;
CREATE POLICY aeromind_feedback_staff_update ON public.aeromind_feedback
 FOR UPDATE TO authenticated
 USING (EXISTS (
  SELECT 1 FROM public.aeromind_staff s
  WHERE s.user_id=(SELECT auth.uid()) AND s.role IN ('owner','admin')
 ))
 WITH CHECK (EXISTS (
  SELECT 1 FROM public.aeromind_staff s
  WHERE s.user_id=(SELECT auth.uid()) AND s.role IN ('owner','admin')
 ));

-- Enforce anti-spam in the database, not just in the front end.
CREATE OR REPLACE FUNCTION private.aeromind_feedback_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN
  RAISE EXCEPTION 'É necessário entrar na própria conta.' USING ERRCODE='42501';
 END IF;
 IF EXISTS (
  SELECT 1 FROM public.aeromind_feedback f
  WHERE f.user_id=NEW.user_id AND f.created_at > now()-interval '60 seconds'
 ) THEN
  RAISE EXCEPTION 'Aguarde um minuto entre envios.' USING ERRCODE='23514';
 END IF;
 IF (SELECT count(*) FROM public.aeromind_feedback f
     WHERE f.user_id=NEW.user_id AND f.created_at>now()-interval '24 hours')>=5 THEN
  RAISE EXCEPTION 'Limite de cinco contribuições por dia atingido.' USING ERRCODE='23514';
 END IF;
 NEW.title=btrim(NEW.title);
 NEW.message=btrim(NEW.message);
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.aeromind_feedback_guard() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS aeromind_feedback_preinsert ON public.aeromind_feedback;
CREATE TRIGGER aeromind_feedback_preinsert
 BEFORE INSERT ON public.aeromind_feedback FOR EACH ROW
 EXECUTE FUNCTION private.aeromind_feedback_guard();

CREATE OR REPLACE FUNCTION private.aeromind_feedback_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $$
BEGIN
 NEW.updated_at=now();
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.aeromind_feedback_touch() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS aeromind_feedback_updated ON public.aeromind_feedback;
CREATE TRIGGER aeromind_feedback_updated
 BEFORE UPDATE ON public.aeromind_feedback FOR EACH ROW
 EXECUTE FUNCTION private.aeromind_feedback_touch();
