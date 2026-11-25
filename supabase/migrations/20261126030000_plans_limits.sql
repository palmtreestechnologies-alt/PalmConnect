-- Plans: Starter / Business / Enterprise with configurable limits (replaces room-count tiers).
-- Existing plan rows are renamed in place so existing subscriptions keep working. Prices are unchanged and stay editable.
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS max_branches INTEGER,
  ADD COLUMN IF NOT EXISTS max_routers INTEGER,
  ADD COLUMN IF NOT EXISTS max_staff_accounts INTEGER,
  ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '{}'::jsonb;

-- NULL limit means unlimited. These are starting values; change them in the table, not in code.
UPDATE public.subscription_plans SET code = 'starter', name = 'Starter',
  examples = ARRAY['Airbnb hosts','Villas','Guest houses','Cafes'], is_popular = false,
  max_branches = 1, max_routers = 1, max_staff_accounts = 10
  WHERE code = 'small_stay';
UPDATE public.subscription_plans SET code = 'business', name = 'Business',
  examples = ARRAY['Hotels','Restaurants','Clinics','Schools'], is_popular = true,
  max_branches = 3, max_routers = 5, max_staff_accounts = 50
  WHERE code = 'growth_hospitality';
UPDATE public.subscription_plans SET code = 'enterprise', name = 'Enterprise',
  examples = ARRAY['Resorts','Hospitals','Colleges','Multi-branch groups'], is_popular = false,
  max_branches = NULL, max_routers = NULL, max_staff_accounts = NULL
  WHERE code = 'hospitality_pro';

-- Room-count auto tiering no longer applies: plan is chosen by the owner and limited by the limits above.
DROP TRIGGER IF EXISTS properties_recalc_aiud ON public.properties;

-- New businesses start on Starter.
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE start_id uuid; days int;
BEGIN
  SELECT id INTO start_id FROM public.subscription_plans WHERE code = 'starter';
  SELECT COALESCE((SELECT (value #>> '{}')::int FROM public.platform_settings WHERE key = 'trial_days'), 10) INTO days;
  INSERT INTO public.subscriptions (business_id, plan_id, status, trial_started_at, trial_ends_at)
  VALUES (NEW.id, start_id, 'trialing', now(), now() + make_interval(days => days))
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Enforced in the database: a business cannot register more routers than its plan allows.
CREATE OR REPLACE FUNCTION public.plan_allows_router(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT p.max_routers IS NULL OR (SELECT count(*) FROM public.routers r WHERE r.business_id = _business_id) < p.max_routers
    FROM public.subscriptions s JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.business_id = _business_id
  ), false);
$$;
REVOKE ALL ON FUNCTION public.plan_allows_router(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plan_allows_router(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Plan router limit" ON public.routers;
CREATE POLICY "Plan router limit" ON public.routers AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.plan_allows_router(business_id));
