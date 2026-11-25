CREATE TABLE public.staff_wifi_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  router_id UUID REFERENCES public.routers(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  staff_name TEXT NOT NULL,
  role_label TEXT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  mac_address TEXT,
  phone TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_wifi_access_business ON public.staff_wifi_access(business_id);

ALTER TABLE public.staff_wifi_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Biz view staff_wifi_access" ON public.staff_wifi_access
  FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Biz insert staff_wifi_access" ON public.staff_wifi_access
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = public.get_user_business_id(auth.uid())
    AND (public.has_role(auth.uid(), 'business_owner') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Biz update staff_wifi_access" ON public.staff_wifi_access
  FOR UPDATE TO authenticated
  USING (
    business_id = public.get_user_business_id(auth.uid())
    AND (public.has_role(auth.uid(), 'business_owner') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'super_admin'))
  );

CREATE POLICY "Owner delete staff_wifi_access" ON public.staff_wifi_access
  FOR DELETE TO authenticated
  USING (
    (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(), 'business_owner'))
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE TRIGGER trg_staff_wifi_access_updated_at
  BEFORE UPDATE ON public.staff_wifi_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();