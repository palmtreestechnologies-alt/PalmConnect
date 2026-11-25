CREATE TABLE public.router_health (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  router_id UUID NOT NULL,
  business_id UUID NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reachable BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  cpu_load INTEGER,
  memory_used_pct INTEGER,
  uptime_seconds BIGINT,
  firmware TEXT,
  board_name TEXT,
  active_users INTEGER,
  rx_kbps INTEGER,
  tx_kbps INTEGER
);

CREATE INDEX idx_router_health_router_recorded ON public.router_health (router_id, recorded_at DESC);
CREATE INDEX idx_router_health_business ON public.router_health (business_id, recorded_at DESC);

ALTER TABLE public.router_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Biz view router_health"
  ON public.router_health FOR SELECT
  TO authenticated
  USING ((business_id = public.get_user_business_id(auth.uid())) OR public.has_role(auth.uid(), 'super_admin'::public.app_role));
