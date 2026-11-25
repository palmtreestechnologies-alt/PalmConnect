-- Phase A: extend businesses with branding + hotspot settings
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS support_phone text,
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS terms_and_conditions text,
  ADD COLUMN IF NOT EXISTS hotspot_username_prefix text NOT NULL DEFAULT 'P',
  ADD COLUMN IF NOT EXISTS captive_portal_template text NOT NULL DEFAULT 'monochrome',
  ADD COLUMN IF NOT EXISTS captive_portal_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS voucher_expiry_days integer,
  ADD COLUMN IF NOT EXISTS redirect_url_after_purchase text,
  ADD COLUMN IF NOT EXISTS prune_inactive_after_days integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS theme_preference text NOT NULL DEFAULT 'system';

-- Logos bucket (public read for branding)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: business members can upload/update/delete their own logo;
-- everyone can read (public bucket).
DROP POLICY IF EXISTS "Public read business logos" ON storage.objects;
CREATE POLICY "Public read business logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

DROP POLICY IF EXISTS "Biz upload own logo" ON storage.objects;
CREATE POLICY "Biz upload own logo"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = public.get_user_business_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "Biz update own logo" ON storage.objects;
CREATE POLICY "Biz update own logo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = public.get_user_business_id(auth.uid())::text
  );

DROP POLICY IF EXISTS "Biz delete own logo" ON storage.objects;
CREATE POLICY "Biz delete own logo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-logos'
    AND (storage.foldername(name))[1] = public.get_user_business_id(auth.uid())::text
  );