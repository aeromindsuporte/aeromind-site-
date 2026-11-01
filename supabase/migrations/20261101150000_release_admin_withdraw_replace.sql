-- AeroMind: safe administrator release withdrawal and same-version replacement.
-- Preserves download audit records and old objects. Does not mutate any published release on installation.
CREATE OR REPLACE FUNCTION public.aeromind_admin_unpublish_release(
  p_version_code integer,
  p_expected_path text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_release public.aeromind_app_releases%rowtype;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.aeromind_staff s
    JOIN auth.users u ON u.id=s.user_id
    WHERE s.user_id=auth.uid()
      AND s.role IN ('owner','admin')
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo negado' USING ERRCODE='42501';
  END IF;
  IF p_version_code IS NULL OR p_version_code < 1
     OR p_expected_path IS NULL
     OR p_expected_path !~ '^releases/aeromind-v[0-9]+-[a-f0-9]{16}[.]apk$' THEN
    RAISE EXCEPTION 'Versão inválida' USING ERRCODE='22023';
  END IF;

  -- Serialize with the standard release publisher and replacement handler.
  PERFORM pg_advisory_xact_lock(58302922);
  SELECT * INTO v_release FROM public.aeromind_app_releases
   WHERE version_code=p_version_code FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Versão não encontrada' USING ERRCODE='22023'; END IF;
  IF v_release.status <> 'published' THEN
    RAISE EXCEPTION 'A versão já não está publicada' USING ERRCODE='22023';
  END IF;
  IF v_release.storage_path <> p_expected_path THEN
    RAISE EXCEPTION 'A publicação foi alterada; atualize a página' USING ERRCODE='22023';
  END IF;

  UPDATE public.aeromind_app_releases SET status='retired'
   WHERE id=v_release.id;
  RETURN jsonb_build_object('ok',true,'version_code',p_version_code,'status','retired');
END
$function$;

REVOKE ALL ON FUNCTION public.aeromind_admin_unpublish_release(integer,text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aeromind_admin_unpublish_release(integer,text)
 TO authenticated;

CREATE OR REPLACE FUNCTION public.aeromind_admin_replace_release(
  p_version_code integer,
  p_version_name text,
  p_storage_path text,
  p_sha256 text,
  p_size_bytes bigint,
  p_release_notes text DEFAULT ''
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_release public.aeromind_app_releases%rowtype;
  v_storage_size bigint;
  v_newer_published integer;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.aeromind_staff s
    JOIN auth.users u ON u.id=s.user_id
    WHERE s.user_id=auth.uid()
      AND s.role IN ('owner','admin')
      AND u.email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Acesso administrativo negado' USING ERRCODE='42501';
  END IF;
  IF p_version_code IS NULL OR p_version_code < 1
     OR p_version_name IS NULL OR char_length(trim(p_version_name)) NOT BETWEEN 1 AND 40
     OR p_sha256 IS NULL OR p_sha256 !~ '^[a-f0-9]{64}$'
     OR p_storage_path IS NULL OR p_storage_path <>
        ('releases/aeromind-v'||p_version_code::text||'-'||left(p_sha256,16)||'.apk')
     OR p_size_bytes IS NULL OR p_size_bytes NOT BETWEEN 20000 AND 6291456
     OR char_length(coalesce(p_release_notes,'')) > 2000 THEN
    RAISE EXCEPTION 'Dados inválidos para substituição' USING ERRCODE='22023';
  END IF;

  PERFORM pg_advisory_xact_lock(58302922);
  SELECT * INTO v_release FROM public.aeromind_app_releases
   WHERE version_code=p_version_code FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Versão inexistente: publique uma nova versão' USING ERRCODE='22023';
  END IF;

  SELECT max(version_code) INTO v_newer_published
    FROM public.aeromind_app_releases
    WHERE status='published';
  IF v_newer_published IS NOT NULL AND v_newer_published > p_version_code THEN
    RAISE EXCEPTION 'Não é permitido retroceder a versão publicada' USING ERRCODE='22023';
  END IF;

  SELECT (metadata->>'size')::bigint INTO v_storage_size
    FROM storage.objects
    WHERE bucket_id='aeromind-apk-releases' AND name=p_storage_path;
  IF v_storage_size IS DISTINCT FROM p_size_bytes THEN
    RAISE EXCEPTION 'APK ausente ou tamanho divergente' USING ERRCODE='22023';
  END IF;

  UPDATE public.aeromind_app_releases SET status='retired'
    WHERE status='published' AND id<>v_release.id;
  UPDATE public.aeromind_app_releases
    SET version_name=trim(p_version_name), storage_path=p_storage_path,
        sha256=p_sha256, size_bytes=p_size_bytes, release_notes=coalesce(p_release_notes,''),
        status='published', published_at=now()
    WHERE id=v_release.id;
  RETURN v_release.id;
END
$function$;

REVOKE ALL ON FUNCTION public.aeromind_admin_replace_release(integer,text,text,text,bigint,text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aeromind_admin_replace_release(integer,text,text,text,bigint,text)
 TO authenticated;
