-- Alertas de resposta a sugestões do AeroMind, 2026-11-02.
-- Um único estado de leitura por sugestão, renovado somente quando a resposta muda.
ALTER TABLE public.aeromind_feedback
 ADD COLUMN IF NOT EXISTS admin_reply_at timestamptz,
 ADD COLUMN IF NOT EXISTS reply_read_at timestamptz;

-- Respostas anteriores continuam no histórico sem gerar alerta retroativo.
UPDATE public.aeromind_feedback
 SET admin_reply_at=updated_at,reply_read_at=updated_at
 WHERE nullif(btrim(admin_reply),'') IS NOT NULL AND admin_reply_at IS NULL;

CREATE INDEX IF NOT EXISTS aeromind_feedback_unread_reply_idx
 ON public.aeromind_feedback(user_id,admin_reply_at DESC)
 WHERE reply_read_at IS NULL AND admin_reply_at IS NOT NULL;

CREATE OR REPLACE FUNCTION private.aeromind_feedback_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path TO ''
AS $$
BEGIN
 NEW.updated_at=now();
 IF OLD.admin_reply IS DISTINCT FROM NEW.admin_reply THEN
  IF nullif(btrim(NEW.admin_reply),'') IS NOT NULL THEN
   NEW.admin_reply_at=now();
   NEW.reply_read_at=NULL;
  ELSE
   NEW.admin_reply_at=NULL;
   NEW.reply_read_at=NULL;
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.aeromind_feedback_touch() FROM PUBLIC,anon,authenticated;

-- A confirmação de leitura só pode atuar sobre uma sugestão do usuário logado.
-- Colunas internas de leitura não recebem GRANT de edição direta no Data API.
CREATE OR REPLACE FUNCTION public.aeromind_feedback_mark_reply_read(p_feedback_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE v_id uuid;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN RETURN FALSE; END IF;
 UPDATE public.aeromind_feedback
 SET reply_read_at=coalesce(reply_read_at,now())
 WHERE id=p_feedback_id
   AND user_id=(SELECT auth.uid())
   AND nullif(btrim(admin_reply),'') IS NOT NULL
 RETURNING id INTO v_id;
 RETURN v_id IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.aeromind_feedback_mark_reply_read(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.aeromind_feedback_mark_reply_read(uuid) TO authenticated;
