-- Front-desk guest registration records the guest's phone number (additive, no data touched).
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS guest_phone TEXT
  CHECK (guest_phone IS NULL OR guest_phone ~ '^[0-9]{9,15}$');
