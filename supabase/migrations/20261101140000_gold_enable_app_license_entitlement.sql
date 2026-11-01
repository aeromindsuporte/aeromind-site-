-- Activate Gold in the Android entitlement RPC for valid Ultra (commercial Gold) licenses.
-- Keep checkout disabled until the separately tested commercial release.
-- Explicit per-user Gold grants/revocations retain priority over license-derived access.
CREATE OR REPLACE FUNCTION public.aeromind_gold_my_entitlement()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  who uuid := auth.uid();
  has_base boolean := false;
  gold_license_until timestamptz;
  rollout_on boolean := false;
  manual_enabled boolean;
  manual_until timestamptz;
  manual_exists boolean := false;
  entitled boolean := false;
  expires_at timestamptz;
BEGIN
  IF who IS NULL THEN
    RAISE EXCEPTION 'Entre na sua conta' USING ERRCODE='42501';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.licenses l
    WHERE l.user_id=who AND l.status='active' AND l.valid_until>now()
  ) INTO has_base;

  -- "Ultra" is the stored tier for the commercial Gold license.
  SELECT MAX(l.valid_until) INTO gold_license_until
  FROM public.licenses l
  WHERE l.user_id=who AND l.plan_name='Ultra'
    AND l.status='active' AND l.valid_until>now();

  SELECT r.enabled INTO rollout_on
  FROM private.aeromind_gold_rollout r WHERE r.singleton=true;

  SELECT a.enabled,a.valid_until INTO manual_enabled,manual_until
  FROM public.aeromind_gold_access a WHERE a.user_id=who;
  manual_exists := FOUND;

  IF manual_exists THEN
    -- Preserve a staff-issued grant or explicit revocation.
    entitled := COALESCE(manual_enabled,false) AND COALESCE(manual_until>now(),false);
    expires_at := manual_until;
  ELSE
    -- Paid Gold/legacy Ultra licenses need no additional manual access row.
    entitled := gold_license_until IS NOT NULL;
    expires_at := gold_license_until;
  END IF;

  RETURN jsonb_build_object(
    'app_access',has_base,
    'gold_access',entitled,
    'gold_expires_at',expires_at,
    'gold_rollout_enabled',COALESCE(rollout_on,false),
    'can_use_gold',has_base AND COALESCE(rollout_on,false) AND entitled
  );
END
$function$;

REVOKE ALL ON FUNCTION public.aeromind_gold_my_entitlement() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.aeromind_gold_my_entitlement() TO authenticated;

-- Only the app entitlement rollout is enabled; sales and external signal ingestion stay off.
UPDATE private.aeromind_gold_rollout
SET enabled=true, updated_at=now()
WHERE singleton=true;
