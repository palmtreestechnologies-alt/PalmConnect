-- Security hardening: fixes C1 (owner -> super_admin escalation) and C2 (business takeover
-- through profiles.business_id), plus audit log forgery.
--
-- PRE-FLIGHT (run before applying, in the SQL editor):
--   SELECT * FROM public.user_roles WHERE role = 'super_admin';
-- Platform super_admin rows MUST have business_id IS NULL after this migration, otherwise they stop
-- counting as super_admin. Fix legitimate ones with:
--   UPDATE public.user_roles SET business_id = NULL WHERE role = 'super_admin' AND user_id = '<your user id>';
-- Delete any super_admin row you did not create yourself.

-- 1. Role checks that respect business scope.
--    - super_admin is a platform role: only a row with business_id IS NULL counts.
--    - other roles only count for the business the user currently belongs to.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND (
        (_role = 'super_admin' AND ur.business_id IS NULL)
        OR
        (_role <> 'super_admin' AND ur.business_id IS NOT NULL
          AND ur.business_id = (SELECT p.business_id FROM public.profiles p WHERE p.id = _user_id))
      )
  );
$$;

-- 2. user_roles: owners may only manage business-level roles inside their own business.
--    Platform roles (super_admin) can only be granted with the service role / SQL editor.
DROP POLICY IF EXISTS "Owners manage roles in biz" ON public.user_roles;

CREATE POLICY "Owners insert staff roles in own biz" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    role IN ('staff', 'business_owner')
    AND business_id IS NOT NULL
    AND business_id = public.get_user_business_id(auth.uid())
    AND public.has_role(auth.uid(), 'business_owner')
  );

CREATE POLICY "Owners update staff roles in own biz" ON public.user_roles FOR UPDATE TO authenticated
  USING (
    role IN ('staff', 'business_owner')
    AND business_id = public.get_user_business_id(auth.uid())
    AND public.has_role(auth.uid(), 'business_owner')
  )
  WITH CHECK (
    role IN ('staff', 'business_owner')
    AND business_id = public.get_user_business_id(auth.uid())
    AND public.has_role(auth.uid(), 'business_owner')
  );

CREATE POLICY "Owners delete staff roles in own biz" ON public.user_roles FOR DELETE TO authenticated
  USING (
    role IN ('staff', 'business_owner')
    AND business_id = public.get_user_business_id(auth.uid())
    AND public.has_role(auth.uid(), 'business_owner')
    AND user_id <> auth.uid()
  );

-- 3. profiles: users may edit their own row, but never move themselves to another business.
DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_profile_business_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- auth.uid() is NULL for the service role, SQL editor and migrations; set for app users.
  IF NEW.business_id IS DISTINCT FROM OLD.business_id AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'business_id cannot be changed by users' USING ERRCODE = '42501';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'id cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_prevent_business_change ON public.profiles;
CREATE TRIGGER trg_profiles_prevent_business_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_business_change();

-- 4. audit_logs: a user may only write entries for their own business, as themselves.
DROP POLICY IF EXISTS "Auth insert audit" ON public.audit_logs;
CREATE POLICY "Auth insert audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND business_id = public.get_user_business_id(auth.uid())
  );

-- 5. Lock down helper functions so they cannot be called by anonymous clients.
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_business_id(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_business_id(UUID) TO authenticated, service_role;

-- 6. Secrets are no longer readable from browsers.
--    Edge functions read them with the service role. The UI uses these boolean flags instead.
ALTER TABLE public.mpesa_credentials
  ADD COLUMN IF NOT EXISTS consumer_secret_set BOOLEAN GENERATED ALWAYS AS (consumer_secret IS NOT NULL AND consumer_secret <> '') STORED,
  ADD COLUMN IF NOT EXISTS passkey_set BOOLEAN GENERATED ALWAYS AS (passkey IS NOT NULL AND passkey <> '') STORED;

REVOKE SELECT ON public.mpesa_credentials FROM authenticated, anon;
GRANT SELECT (id, business_id, environment, consumer_key, shortcode, paybill_type, active,
              last_verified_at, last_verified_status, last_verified_message,
              consumer_secret_set, passkey_set, created_at, updated_at)
  ON public.mpesa_credentials TO authenticated;

REVOKE SELECT ON public.routers FROM authenticated, anon;
GRANT SELECT (id, business_id, name, host, api_port, username, status, last_seen_at, created_at, updated_at)
  ON public.routers TO authenticated;

-- NOTE: secrets are still stored as plain text in the database. Encryption at rest (key held in the
-- edge function environment, not in the database) is scheduled for week 2.
