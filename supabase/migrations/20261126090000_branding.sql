-- Business branding: own logo and two brand colours. NULL colour = use the Palm Connect palette.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS accent_color TEXT;

-- The old default (#0F5132) was a placeholder, not a choice the business made.
ALTER TABLE public.businesses ALTER COLUMN primary_color DROP DEFAULT;
UPDATE public.businesses SET primary_color = NULL WHERE primary_color = '#0F5132';

-- Colours end up in CSS, so only strict hex values are accepted (applies to new writes).
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_primary_color_hex;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_primary_color_hex
  CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$') NOT VALID;
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_accent_color_hex;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_accent_color_hex
  CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$') NOT VALID;

-- Logos: small raster images only (SVG can carry script when opened directly).
UPDATE storage.buckets
   SET file_size_limit = 1048576, allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp']
 WHERE id = 'business-logos';
