-- Drop superseded columns on businesses
ALTER TABLE public.businesses DROP COLUMN IF EXISTS mpesa_shortcode;
ALTER TABLE public.businesses DROP COLUMN IF EXISTS mpesa_paybill_type;

-- New per-business M-Pesa credentials table
CREATE TABLE IF NOT EXISTS public.mpesa_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox','production')),
  consumer_key TEXT,
  consumer_secret TEXT,
  passkey TEXT,
  shortcode TEXT,
  paybill_type TEXT NOT NULL DEFAULT 'paybill' CHECK (paybill_type IN ('paybill','till')),
  active BOOLEAN NOT NULL DEFAULT false,
  last_verified_at TIMESTAMPTZ,
  last_verified_status TEXT,
  last_verified_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, environment)
);

CREATE INDEX IF NOT EXISTS idx_mpesa_creds_biz ON public.mpesa_credentials(business_id);

ALTER TABLE public.mpesa_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner view mpesa_credentials"
  ON public.mpesa_credentials FOR SELECT
  TO authenticated
  USING (
    (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(), 'business_owner'::app_role))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Owner insert mpesa_credentials"
  ON public.mpesa_credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id = get_user_business_id(auth.uid())
    AND has_role(auth.uid(), 'business_owner'::app_role)
  );

CREATE POLICY "Owner update mpesa_credentials"
  ON public.mpesa_credentials FOR UPDATE
  TO authenticated
  USING (
    business_id = get_user_business_id(auth.uid())
    AND has_role(auth.uid(), 'business_owner'::app_role)
  );

CREATE POLICY "Owner delete mpesa_credentials"
  ON public.mpesa_credentials FOR DELETE
  TO authenticated
  USING (
    business_id = get_user_business_id(auth.uid())
    AND has_role(auth.uid(), 'business_owner'::app_role)
  );

CREATE TRIGGER trg_mpesa_creds_updated
BEFORE UPDATE ON public.mpesa_credentials
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
