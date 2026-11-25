-- Optional per-guest speed limit (kbps, same up and down). NULL = use the package's speed, or unlimited.
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS speed_kbps INTEGER CHECK (speed_kbps IS NULL OR speed_kbps BETWEEN 128 AND 1000000);

-- The router agent now prefers the guest's own speed over the package speed.
CREATE OR REPLACE FUNCTION public.agent_pull(_router_id uuid, _key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; items jsonb; maxseq bigint;
BEGIN
  SELECT id, business_id, acked_seq INTO r FROM public.routers
   WHERE id = _router_id AND connection_mode = 'agent' AND agent_key_hash = encode(sha256(convert_to(_key, 'UTF8')), 'hex');
  IF NOT FOUND THEN RETURN NULL; END IF;

  UPDATE public.vouchers SET status = 'expired'
   WHERE business_id = r.business_id AND status IN ('unused','active') AND expires_at IS NOT NULL AND expires_at < now();

  WITH batch AS (
    SELECT v.agent_seq, v.username, v.password, v.status,
           COALESCE(v.device_limit, p.device_limit, 1) AS devices,
           COALESCE(v.speed_kbps, p.download_kbps) AS down, COALESCE(v.speed_kbps, p.upload_kbps) AS up, p.data_limit_mb AS mb
    FROM public.vouchers v LEFT JOIN public.packages p ON p.id = v.package_id
    WHERE v.business_id = r.business_id AND v.agent_seq > r.acked_seq
      AND v.username ~ '^[A-Za-z0-9_.-]{3,32}$' AND v.password ~ '^[A-Za-z0-9]{4,32}$'
      AND (v.status IN ('unused','active') OR v.expires_at IS NULL OR v.expires_at > now() - interval '14 days')
    ORDER BY v.agent_seq LIMIT 200
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           's', agent_seq, 'u', username, 'p', password, 'd', LEAST(GREATEST(devices,1),10), 'down', down, 'up', up, 'mb', mb,
           'on', status IN ('unused','active')) ORDER BY agent_seq), '[]'::jsonb),
         COALESCE(max(agent_seq), r.acked_seq)
    INTO items, maxseq FROM batch;
  RETURN jsonb_build_object('seq', maxseq, 'items', items);
END; $$;
REVOKE ALL ON FUNCTION public.agent_pull(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_pull(uuid, text) TO service_role;

-- Log of guest SMS. Written only by the send-guest-sms function (service role); owners can read it.
CREATE TABLE IF NOT EXISTS public.sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_log_business_created ON public.sms_log (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS sms_log_voucher ON public.sms_log (voucher_id);
ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_log FROM anon, authenticated;
GRANT SELECT ON public.sms_log TO authenticated;
CREATE POLICY "Biz view sms_log" ON public.sms_log FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
