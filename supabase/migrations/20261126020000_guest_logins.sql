-- Guests never pay. Staff issue each guest a unique login with a device limit.
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS room TEXT,
  ADD COLUMN IF NOT EXISTS device_limit INTEGER CHECK (device_limit BETWEEN 1 AND 10);

-- Usernames must be unique within a business so two guests can never share a login.
CREATE UNIQUE INDEX IF NOT EXISTS vouchers_business_username_uniq ON public.vouchers (business_id, username);

-- Per-venue guest M-Pesa collection is removed. Keep the table (no data is deleted) but close it to all clients.
REVOKE ALL ON public.mpesa_credentials FROM authenticated, anon;
