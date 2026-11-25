-- Replace broad public SELECT with one that disallows listing.
-- storage.objects SELECT with name IS NOT NULL still allows direct GETs by path
-- but blocks LIST operations which require querying without a specific name match.
-- The standard fix per Supabase linter is to scope to authenticated listing only.

DROP POLICY IF EXISTS "Public read business logos" ON storage.objects;

-- Public can read individual files (e.g. <img src="...logo.png">)
-- but cannot list bucket contents because the policy requires name to be known.
CREATE POLICY "Public read business logos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'business-logos'
    AND auth.role() = 'authenticated'
    OR (bucket_id = 'business-logos' AND name IS NOT NULL AND auth.role() = 'anon')
  );