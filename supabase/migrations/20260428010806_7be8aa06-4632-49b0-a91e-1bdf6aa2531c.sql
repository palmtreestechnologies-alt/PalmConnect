ALTER TABLE public.staff_wifi_access
  ADD COLUMN download_kbps integer,
  ADD COLUMN upload_kbps integer,
  ADD COLUMN session_timeout_minutes integer,
  ADD COLUMN idle_timeout_minutes integer,
  ADD COLUMN data_limit_mb integer,
  ADD COLUMN sync_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN last_synced_at timestamptz;