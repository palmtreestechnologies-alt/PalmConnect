
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS auto_renew boolean NOT NULL DEFAULT false;

-- Backfill existing rows so they aren't accidentally read-only
UPDATE public.subscriptions
  SET trial_started_at = COALESCE(trial_started_at, created_at),
      trial_ends_at    = COALESCE(trial_ends_at, created_at + interval '14 days'),
      status           = CASE WHEN status = 'active' THEN 'trialing' ELSE status END
  WHERE trial_started_at IS NULL;

-- Updated default-subscription trigger: start trial immediately
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE small_id uuid;
BEGIN
  SELECT id INTO small_id FROM public.subscription_plans WHERE code = 'small_stay';
  INSERT INTO public.subscriptions (business_id, plan_id, status, trial_started_at, trial_ends_at)
  VALUES (NEW.id, small_id, 'trialing', now(), now() + interval '14 days')
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- Allow the owner to update their own subscription (plan choice, payment method)
DROP POLICY IF EXISTS "Owner update subscription" ON public.subscriptions;
CREATE POLICY "Owner update subscription"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid())
         AND public.has_role(auth.uid(), 'business_owner'))
  WITH CHECK (business_id = public.get_user_business_id(auth.uid())
              AND public.has_role(auth.uid(), 'business_owner'));

-- Read-only helper
CREATE OR REPLACE FUNCTION public.is_account_readonly(_business_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE business_id = _business_id
      AND status = 'trialing'
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at < now()
  );
$$;
