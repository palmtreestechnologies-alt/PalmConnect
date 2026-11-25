-- Roles enum and user_roles table (separate, secure)
CREATE TYPE public.app_role AS ENUM ('super_admin', 'business_owner', 'staff');
CREATE TYPE public.business_type AS ENUM ('restaurant','cafe','lounge','villa','airbnb','guesthouse','hotel','home','hotspot_business','other');

CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.business_type NOT NULL DEFAULT 'restaurant',
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0F5132',
  welcome_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, business_id)
);

CREATE TABLE public.routers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  api_port INTEGER NOT NULL DEFAULT 443,
  username TEXT NOT NULL,
  -- Note: password should be stored encrypted; placeholder for v1 mock
  password_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'offline',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  download_kbps INTEGER,
  upload_kbps INTEGER,
  data_limit_mb INTEGER,
  device_limit INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KES',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  router_id UUID REFERENCES public.routers(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  mac_address TEXT,
  status TEXT NOT NULL DEFAULT 'unused', -- unused, active, used, expired
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vouchers_business ON public.vouchers(business_id);
CREATE INDEX idx_vouchers_batch ON public.vouchers(batch_id);
CREATE UNIQUE INDEX idx_vouchers_username_business ON public.vouchers(business_id, username);

CREATE TABLE public.hotspot_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  router_id UUID REFERENCES public.routers(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  mac_address TEXT,
  phone TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security definer function for role checks (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT business_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Trigger: on signup, create profile + business + owner role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_business_id UUID;
  biz_name TEXT;
  biz_type public.business_type;
BEGIN
  biz_name := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
  biz_type := COALESCE((NEW.raw_user_meta_data->>'business_type')::public.business_type, 'restaurant');

  INSERT INTO public.businesses (name, type, email, phone)
  VALUES (biz_name, biz_type, NEW.email, NEW.raw_user_meta_data->>'phone')
  RETURNING id INTO new_business_id;

  INSERT INTO public.profiles (id, business_id, full_name, email, phone)
  VALUES (NEW.id, new_business_id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          NEW.email,
          NEW.raw_user_meta_data->>'phone');

  INSERT INTO public.user_roles (user_id, role, business_id)
  VALUES (NEW.id, 'business_owner', new_business_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_businesses_updated BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_routers_updated BEFORE UPDATE ON public.routers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_hotspot_users_updated BEFORE UPDATE ON public.hotspot_users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotspot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Businesses
CREATE POLICY "View own business" ON public.businesses FOR SELECT TO authenticated
  USING (id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Owner update business" ON public.businesses FOR UPDATE TO authenticated
  USING ((id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(),'business_owner')) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admin delete business" ON public.businesses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

-- Profiles
CREATE POLICY "View own profile or same biz" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- User roles
CREATE POLICY "View roles in own biz" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Owners manage roles in biz" ON public.user_roles FOR ALL TO authenticated
  USING ((business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(),'business_owner')) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK ((business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(),'business_owner')) OR public.has_role(auth.uid(),'super_admin'));

-- Generic biz-scoped policy maker via repeated inline:
-- Routers
CREATE POLICY "Biz view routers" ON public.routers FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Biz insert routers" ON public.routers FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Biz update routers" ON public.routers FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Owner delete routers" ON public.routers FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(),'business_owner'));

-- Packages
CREATE POLICY "Biz view packages" ON public.packages FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Biz insert packages" ON public.packages FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Biz update packages" ON public.packages FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Owner delete packages" ON public.packages FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) AND public.has_role(auth.uid(),'business_owner'));

-- Vouchers
CREATE POLICY "Biz view vouchers" ON public.vouchers FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Biz insert vouchers" ON public.vouchers FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Biz update vouchers" ON public.vouchers FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Biz delete vouchers" ON public.vouchers FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

-- Hotspot users
CREATE POLICY "Biz view hotspot_users" ON public.hotspot_users FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Biz insert hotspot_users" ON public.hotspot_users FOR INSERT TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Biz update hotspot_users" ON public.hotspot_users FOR UPDATE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));
CREATE POLICY "Biz delete hotspot_users" ON public.hotspot_users FOR DELETE TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()));

-- Audit logs
CREATE POLICY "Biz view audit" ON public.audit_logs FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Auth insert audit" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());