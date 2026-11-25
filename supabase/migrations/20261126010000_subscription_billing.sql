-- Subscription billing: 10-day trial, payment to Palm Trees, server-enforced access.

-- 1. Trial length is a platform setting (default 10 days). Existing trials are not changed.
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read platform settings" ON public.platform_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin writes platform settings" ON public.platform_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
REVOKE INSERT, UPDATE, DELETE ON public.platform_settings FROM anon;
INSERT INTO public.platform_settings (key, value) VALUES ('trial_days', '10') ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE small_id uuid; days int;
BEGIN
  SELECT id INTO small_id FROM public.subscription_plans WHERE code = 'small_stay';
  SELECT COALESCE((SELECT (value #>> '{}')::int FROM public.platform_settings WHERE key = 'trial_days'), 10) INTO days;
  INSERT INTO public.subscriptions (business_id, plan_id, status, trial_started_at, trial_ends_at)
  VALUES (NEW.id, small_id, 'trialing', now(), now() + make_interval(days => days))
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 2. Owners can no longer edit their own subscription row (they could set status='active' or extend the trial).
--    Only the platform (super_admin policy, service role) changes it.
DROP POLICY IF EXISTS "Owner update subscription" ON public.subscriptions;

-- Plan choice goes through a function that cannot touch status or dates.
CREATE OR REPLACE FUNCTION public.select_plan(_plan_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE biz uuid; pid uuid; st text;
BEGIN
  biz := public.get_user_business_id(auth.uid());
  IF biz IS NULL OR NOT public.has_role(auth.uid(), 'business_owner') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO pid FROM public.subscription_plans WHERE code = _plan_code;
  IF pid IS NULL THEN RAISE EXCEPTION 'unknown plan'; END IF;
  SELECT status INTO st FROM public.subscriptions WHERE business_id = biz;
  IF st = 'active' THEN
    UPDATE public.subscriptions SET pending_plan_id = pid WHERE business_id = biz;
  ELSE
    UPDATE public.subscriptions SET plan_id = pid WHERE business_id = biz;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.select_plan(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.select_plan(text) TO authenticated;

-- 3. Activation after a confirmed payment. Idempotent: the invoice can only be paid once.
CREATE OR REPLACE FUNCTION public.activate_subscription_payment(_payment_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; inv record; sub record; base timestamptz;
BEGIN
  SELECT * INTO p FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND OR p.status <> 'paid' OR (p.metadata->>'kind') IS DISTINCT FROM 'subscription' THEN RETURN false; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = (p.metadata->>'invoice_id')::uuid FOR UPDATE;
  IF NOT FOUND OR inv.status = 'paid' OR inv.business_id <> p.business_id THEN RETURN false; END IF;
  SELECT * INTO sub FROM public.subscriptions WHERE business_id = inv.business_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Renewing early extends from the current end; otherwise start from now.
  base := CASE WHEN sub.status = 'active' AND sub.current_period_end > now() THEN sub.current_period_end ELSE now() END;
  UPDATE public.invoices SET status = 'paid', paid_at = now(), mpesa_reference = p.metadata->>'mpesa_receipt' WHERE id = inv.id;
  UPDATE public.subscriptions SET
    status = 'active', plan_id = inv.plan_id, pending_plan_id = NULL, grace_until = NULL,
    current_period_start = CASE WHEN sub.status = 'active' AND sub.current_period_end > now() THEN sub.current_period_start ELSE now() END,
    current_period_end = base + interval '30 days',
    payment_method = 'mpesa'
  WHERE id = sub.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_subscription_payment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription_payment(uuid) TO service_role;

-- 4. One definition of "locked": trial over, or paid period ended (3 day grace), or suspended.
CREATE OR REPLACE FUNCTION public.is_account_readonly(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.business_id = _business_id AND s.manual_override = false AND (
      (s.status = 'trialing' AND s.trial_ends_at IS NOT NULL AND s.trial_ends_at < now())
      OR (s.status = 'active' AND s.current_period_end + interval '3 days' < now())
      OR s.status IN ('expired', 'cancelled', 'past_due', 'suspended')
    )
  );
$$;

-- 5. Enforce it in the database, not just in the browser: no new records while locked.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['routers','packages','vouchers','hotspot_users'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Subscription required" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Subscription required" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_account_readonly(business_id))', t);
  END LOOP;
END $$;
