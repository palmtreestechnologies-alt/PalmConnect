-- Router agent: one-command provisioning and pull-based sync (works on RouterOS 6 and 7, behind NAT).

-- Agent routers are never contacted inbound, so host and credentials are optional.
ALTER TABLE public.routers ALTER COLUMN host DROP NOT NULL;
ALTER TABLE public.routers ALTER COLUMN username DROP NOT NULL;

ALTER TABLE public.routers
  ADD COLUMN IF NOT EXISTS connection_mode TEXT NOT NULL DEFAULT 'api' CHECK (connection_mode IN ('api','agent')),
  ADD COLUMN IF NOT EXISTS hotspot_interface TEXT CHECK (hotspot_interface ~ '^[A-Za-z0-9._-]{1,15}$'),
  ADD COLUMN IF NOT EXISTS hotspot_cidr TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS ros_version TEXT,
  ADD COLUMN IF NOT EXISTS provisioned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS agent_key_hash TEXT,
  ADD COLUMN IF NOT EXISTS provisioning_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS provisioning_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acked_seq BIGINT NOT NULL DEFAULT 0;

-- Hotspot network must be a private IPv4 range between /16 and /28 (checked again in the script generator).
ALTER TABLE public.routers DROP CONSTRAINT IF EXISTS routers_hotspot_cidr_valid;
ALTER TABLE public.routers ADD CONSTRAINT routers_hotspot_cidr_valid CHECK (
  hotspot_cidr IS NULL OR (
    hotspot_cidr ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/\d{1,2}$'
    AND masklen(hotspot_cidr::cidr) BETWEEN 16 AND 28
    AND (hotspot_cidr::cidr <<= '10.0.0.0/8'::cidr OR hotspot_cidr::cidr <<= '172.16.0.0/12'::cidr OR hotspot_cidr::cidr <<= '192.168.0.0/16'::cidr)
  )
);

-- Never readable from browsers: key and token hashes.
GRANT SELECT (connection_mode, hotspot_interface, hotspot_cidr, model, ros_version, provisioned_at, acked_seq)
  ON public.routers TO authenticated;

-- Voucher change feed: every insert or update gets a new sequence number the router can ask "what changed since N".
CREATE SEQUENCE IF NOT EXISTS public.voucher_agent_seq;
ALTER TABLE public.vouchers ADD COLUMN IF NOT EXISTS agent_seq BIGINT;
UPDATE public.vouchers SET agent_seq = nextval('public.voucher_agent_seq') WHERE agent_seq IS NULL;
CREATE OR REPLACE FUNCTION public.bump_voucher_seq() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.agent_seq := nextval('public.voucher_agent_seq'); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_voucher_agent_seq ON public.vouchers;
CREATE TRIGGER trg_voucher_agent_seq BEFORE INSERT OR UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.bump_voucher_seq();
CREATE INDEX IF NOT EXISTS vouchers_business_seq ON public.vouchers (business_id, agent_seq);
-- agent_seq is always overwritten by the trigger above, so a browser cannot forge it.

-- 1. Owner asks for a one-time provisioning token for one of their own routers (valid 60 minutes).
CREATE OR REPLACE FUNCTION public.create_provisioning_token(_router_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tok text; biz uuid;
BEGIN
  biz := public.get_user_business_id(auth.uid());
  IF biz IS NULL OR NOT public.has_role(auth.uid(), 'business_owner')
     OR NOT EXISTS (SELECT 1 FROM public.routers WHERE id = _router_id AND business_id = biz AND connection_mode = 'agent') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  UPDATE public.routers SET
    provisioning_token_hash = encode(sha256(convert_to(tok, 'UTF8')), 'hex'),
    provisioning_expires_at = now() + interval '60 minutes'
  WHERE id = _router_id;
  RETURN tok;
END; $$;
REVOKE ALL ON FUNCTION public.create_provisioning_token(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_provisioning_token(uuid) TO authenticated;

-- 2. The router downloads its script: the token is consumed (single use) and a long-lived agent key is issued.
CREATE OR REPLACE FUNCTION public.consume_provisioning_token(_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE newkey text; r record;
BEGIN
  IF _token !~ '^[0-9a-f]{64}$' THEN RETURN NULL; END IF;
  newkey := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  UPDATE public.routers SET
    provisioning_token_hash = NULL, provisioning_expires_at = NULL, provisioned_at = now(), acked_seq = 0,
    agent_key_hash = encode(sha256(convert_to(newkey, 'UTF8')), 'hex')
  WHERE provisioning_token_hash = encode(sha256(convert_to(_token, 'UTF8')), 'hex')
    AND provisioning_expires_at > now()
  RETURNING id, name, hotspot_interface, hotspot_cidr INTO r;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('router_id', r.id, 'name', r.name, 'key', newkey,
                            'interface', r.hotspot_interface, 'cidr', r.hotspot_cidr);
END; $$;
REVOKE ALL ON FUNCTION public.consume_provisioning_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_provisioning_token(text) TO service_role;

-- 3. Every minute the router asks what changed. Returns NULL when the key is wrong.
CREATE OR REPLACE FUNCTION public.agent_pull(_router_id uuid, _key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; items jsonb; maxseq bigint;
BEGIN
  SELECT id, business_id, acked_seq INTO r FROM public.routers
   WHERE id = _router_id AND connection_mode = 'agent' AND agent_key_hash = encode(sha256(convert_to(_key, 'UTF8')), 'hex');
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Expiry is applied here, so every router of the business learns about it within a minute.
  UPDATE public.vouchers SET status = 'expired'
   WHERE business_id = r.business_id AND status IN ('unused','active') AND expires_at IS NOT NULL AND expires_at < now();

  WITH batch AS (
    SELECT v.agent_seq, v.username, v.password, v.status,
           COALESCE(v.device_limit, p.device_limit, 1) AS devices,
           p.download_kbps AS down, p.upload_kbps AS up, p.data_limit_mb AS mb
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

-- 4. The router confirms it applied everything up to _seq and reports its health.
CREATE OR REPLACE FUNCTION public.agent_ack(_router_id uuid, _key text, _seq bigint, _health jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; cap bigint; mem int;
BEGIN
  SELECT id, business_id INTO r FROM public.routers
   WHERE id = _router_id AND connection_mode = 'agent' AND agent_key_hash = encode(sha256(convert_to(_key, 'UTF8')), 'hex');
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT COALESCE(max(agent_seq), 0) INTO cap FROM public.vouchers WHERE business_id = r.business_id;
  mem := CASE WHEN COALESCE((_health->>'tm')::bigint, 0) > 0
              THEN round(100.0 * (1 - (COALESCE((_health->>'fm')::bigint, 0))::numeric / (_health->>'tm')::bigint)) END;
  UPDATE public.routers SET
    acked_seq = GREATEST(acked_seq, LEAST(COALESCE(_seq, 0), cap)),
    last_seen_at = now(), status = 'online',
    model = COALESCE(NULLIF(_health->>'bd', ''), model), ros_version = COALESCE(NULLIF(_health->>'ver', ''), ros_version)
  WHERE id = r.id;
  INSERT INTO public.router_health (router_id, business_id, reachable, cpu_load, memory_used_pct, uptime_seconds, firmware, board_name, active_users)
  VALUES (r.id, r.business_id, true, (_health->>'cpu')::int, mem, (_health->>'up')::bigint,
          NULLIF(_health->>'ver', ''), NULLIF(_health->>'bd', ''), (_health->>'au')::int);
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.agent_ack(uuid, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agent_ack(uuid, text, bigint, jsonb) TO service_role;
