-- Billing settings on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS mpesa_shortcode TEXT,
  ADD COLUMN IF NOT EXISTS mpesa_paybill_type TEXT NOT NULL DEFAULT 'paybill' CHECK (mpesa_paybill_type IN ('paybill','till')),
  ADD COLUMN IF NOT EXISTS stripe_enabled BOOLEAN NOT NULL DEFAULT false;

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  package_id UUID,
  voucher_id UUID,
  provider TEXT NOT NULL CHECK (provider IN ('mpesa','stripe')),
  provider_ref TEXT NOT NULL UNIQUE,
  phone TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled')),
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payments_business_created ON public.payments(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_provider_ref ON public.payments(provider_ref);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Biz view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Public lookup by provider_ref so unauthenticated self-care page can poll its own checkout.
CREATE POLICY "Public lookup by ref"
  ON public.payments FOR SELECT
  TO anon
  USING (true);
