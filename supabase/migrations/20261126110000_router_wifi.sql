-- The router's own Wi-Fi name, set up by the one-command provisioning.
ALTER TABLE public.routers ADD COLUMN IF NOT EXISTS wifi_ssid TEXT;
ALTER TABLE public.routers DROP CONSTRAINT IF EXISTS routers_wifi_ssid_valid;
ALTER TABLE public.routers ADD CONSTRAINT routers_wifi_ssid_valid
  CHECK (wifi_ssid IS NULL OR wifi_ssid ~ '^[A-Za-z0-9 _-]{1,32}$');

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
  RETURNING id, name, hotspot_interface, hotspot_cidr, wifi_ssid INTO r;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('router_id', r.id, 'name', r.name, 'key', newkey,
                            'interface', r.hotspot_interface, 'cidr', r.hotspot_cidr, 'ssid', r.wifi_ssid);
END; $$;
REVOKE ALL ON FUNCTION public.consume_provisioning_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_provisioning_token(text) TO service_role;
