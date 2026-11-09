-- Beta v87 de abertura nativa (sem URL forçada): ADM com licença e instalação v72 previamente autorizada. Não publicar para clientes.
CREATE OR REPLACE FUNCTION private.aeromind_mobile_beta_latest(
    p_install_hash text,
    p_installed_code integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_uid uuid := auth.uid();
    v_release public.aeromind_app_releases%rowtype;
    v_now timestamptz := now();
BEGIN
    IF p_installed_code NOT IN (53,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86)
       OR p_install_hash IS NULL
       OR p_install_hash !~ '^[a-f0-9]{64}$'
       OR v_uid IS NULL
       OR NOT private.aeromind_verified_staff()
    THEN
        RETURN NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.licenses l
        WHERE l.user_id=v_uid AND l.status='active' AND l.valid_until>v_now
    ) OR NOT EXISTS (
        SELECT 1 FROM public.aeromind_devices d
        WHERE d.user_id=v_uid AND d.install_hash=p_install_hash
          AND d.status='active'
    ) THEN
        RETURN NULL;
    END IF;

    SELECT r.* INTO v_release
    FROM public.aeromind_app_releases r
    JOIN private.aeromind_mobile_beta_rollout b
      ON b.version_code=r.version_code
    WHERE b.enabled
      AND b.valid_until>v_now
      AND r.status='draft'
      AND r.version_code>p_installed_code
      AND (
        -- Legado: teste v53 -> v55, atualmente desabilitado.
        (r.version_code=55 AND p_installed_code=53)
        OR
        -- Beta v58: só o proprietário e o dispositivo testador.
        (r.version_code=58
         AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR
        -- Correção v60 só na conta ADM e aparelho ativo.
        (r.version_code=60
         AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=62
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=64
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=66
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=68
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=70
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=72
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code IN (74,76,78,79,80,81,82,83,84,85,87)
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid
            AND EXISTS (
              SELECT 1 FROM private.aeromind_mobile_beta_grants pilot
              WHERE pilot.version_code=72 AND pilot.user_id=v_uid
                AND pilot.install_hash=p_install_hash))
      )
    ORDER BY r.version_code DESC LIMIT 1;

    IF NOT FOUND THEN RETURN NULL; END IF;

    INSERT INTO private.aeromind_mobile_beta_grants
      (version_code,user_id,install_hash,expires_at)
    VALUES (
      v_release.version_code,v_uid,p_install_hash,
      LEAST(v_now+interval '12 hours',
        (SELECT b.valid_until
         FROM private.aeromind_mobile_beta_rollout b
         WHERE b.version_code=v_release.version_code))
    )
    ON CONFLICT (version_code) DO UPDATE SET expires_at=excluded.expires_at
    WHERE
      (private.aeromind_mobile_beta_grants.user_id=excluded.user_id
       AND private.aeromind_mobile_beta_grants.install_hash=excluded.install_hash)
       OR private.aeromind_mobile_beta_grants.expires_at<v_now;

    IF NOT EXISTS (
      SELECT 1 FROM private.aeromind_mobile_beta_grants g
      WHERE g.version_code=v_release.version_code
        AND g.user_id=v_uid AND g.install_hash=p_install_hash
        AND g.expires_at>v_now
    ) THEN RETURN NULL; END IF;

    RETURN pg_catalog.jsonb_build_object(
        'available',true,'reason','ok','channel','private_beta',
        'latest_code',v_release.version_code,
        'latest_name',v_release.version_name,
        'installed_code',p_installed_code,
        'sha256',v_release.sha256,
        'size_bytes',v_release.size_bytes,
        'notes',v_release.release_notes,
        'published_at',v_now
    );
END
$function$;

CREATE OR REPLACE FUNCTION private.aeromind_mobile_beta_download(
    p_install_hash text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
    v_uid uuid := auth.uid();
    v_release public.aeromind_app_releases%rowtype;
    v_now timestamptz := now();
BEGIN
    IF v_uid IS NULL
       OR p_install_hash IS NULL
       OR p_install_hash !~ '^[a-f0-9]{64}$'
       OR NOT private.aeromind_verified_staff()
    THEN RETURN NULL; END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.licenses l
      WHERE l.user_id=v_uid AND l.status='active' AND l.valid_until>v_now
    ) OR NOT EXISTS (
      SELECT 1 FROM public.aeromind_devices d
      WHERE d.user_id=v_uid AND d.install_hash=p_install_hash
        AND d.status='active'
    ) THEN RETURN NULL; END IF;

    SELECT r.* INTO v_release
    FROM public.aeromind_app_releases r
    JOIN private.aeromind_mobile_beta_rollout b
      ON b.version_code=r.version_code
    JOIN private.aeromind_mobile_beta_grants g
      ON g.version_code=r.version_code
    WHERE b.enabled AND b.valid_until>v_now
      AND g.user_id=v_uid AND g.install_hash=p_install_hash
      AND g.expires_at>v_now
      AND r.status='draft'
      AND (
        r.version_code=55
        OR (r.version_code=58
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=60
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=62
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=64
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=66
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=68
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=70
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code=72
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid)
        OR (r.version_code IN (74,76,78,79,80,81,82,83,84,85,87)
            AND v_uid='c0cdb0a1-0249-42a9-ba00-f680f155a07b'::uuid
            AND EXISTS (
              SELECT 1 FROM private.aeromind_mobile_beta_grants pilot
              WHERE pilot.version_code=72 AND pilot.user_id=v_uid
                AND pilot.install_hash=p_install_hash))
      )
    ORDER BY r.version_code DESC LIMIT 1;

    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN pg_catalog.jsonb_build_object(
      'id',v_release.id,'version_code',v_release.version_code,
      'version_name',v_release.version_name,
      'storage_path',v_release.storage_path,
      'sha256',v_release.sha256,'size_bytes',v_release.size_bytes,
      'status','draft'
    );
END
$function$;

-- A abertura da janela privada é feita separadamente após o deploy.
INSERT INTO private.aeromind_mobile_beta_rollout (version_code,enabled,valid_until)
VALUES (87,false,now()) ON CONFLICT (version_code) DO NOTHING;

-- Não liberar funções privadas a clientes anônimos e não criar chave secreta.
REVOKE ALL ON FUNCTION private.aeromind_mobile_beta_latest(text,integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.aeromind_mobile_beta_download(text) FROM PUBLIC, anon;

-- Manter o acesso dos wrappers autenticados, sem acesso anonimo.
GRANT EXECUTE ON FUNCTION private.aeromind_mobile_beta_latest(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION private.aeromind_mobile_beta_download(text) TO authenticated;
