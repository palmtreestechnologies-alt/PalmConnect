
-- Plans catalog (publicly readable)
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  monthly_price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  min_rooms integer NOT NULL DEFAULT 0,
  max_rooms integer,
  max_properties integer,
  examples text[] NOT NULL DEFAULT '{}',
  is_popular boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are public" ON public.subscription_plans FOR SELECT USING (true);

INSERT INTO public.subscription_plans (code, name, monthly_price_cents, min_rooms, max_rooms, max_properties, examples, is_popular, sort_order) VALUES
  ('small_stay', 'Small Stay', 150000, 1, 10, 1, ARRAY['Airbnb hosts','Villas','Guest houses','Small lodges'], false, 1),
  ('growth_hospitality', 'Growth Hospitality', 350000, 11, 30, 3, ARRAY['Boutique hotels','Lodges','Small resorts'], true, 2),
  ('hospitality_pro', 'Hospitality Pro', 750000, 31, NULL, NULL, ARRAY['Hotels','Resorts','Large hospitality businesses','Multi-property groups'], false, 3);

-- Properties
CREATE TABLE public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  property_type text NOT NULL DEFAULT 'hotel',
  room_count integer NOT NULL DEFAULT 0 CHECK (room_count >= 0),
  address text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE INDEX properties_business_idx ON public.properties(business_id);

CREATE POLICY "Biz view properties" ON public.properties FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Biz insert properties" ON public.properties FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Biz update properties" ON public.properties FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Biz delete properties" ON public.properties FOR DELETE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND has_role(auth.uid(),'business_owner'));

CREATE TRIGGER properties_updated BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Subscriptions (one active per business)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  pending_plan_id uuid REFERENCES public.subscription_plans(id),
  grace_until timestamptz,
  manual_override boolean NOT NULL DEFAULT false,
  override_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Biz view subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Super admin update subscription" ON public.subscriptions FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'super_admin'));

CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.subscription_plans(id),
  invoice_number text UNIQUE NOT NULL DEFAULT ('INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,8)),
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  status text NOT NULL DEFAULT 'pending',
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  due_date timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  mpesa_reference text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE INDEX invoices_business_idx ON public.invoices(business_id, created_at DESC);

CREATE POLICY "Biz view invoices" ON public.invoices FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) OR has_role(auth.uid(),'super_admin'));

-- Plan change notifications
CREATE TABLE public.plan_change_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  from_plan_id uuid REFERENCES public.subscription_plans(id),
  to_plan_id uuid REFERENCES public.subscription_plans(id),
  total_rooms integer NOT NULL,
  total_properties integer NOT NULL,
  message text NOT NULL,
  acknowledged_at timestamptz,
  effective_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_change_notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX pcn_business_idx ON public.plan_change_notifications(business_id, created_at DESC);

CREATE POLICY "Biz view notifications" ON public.plan_change_notifications FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Biz ack notifications" ON public.plan_change_notifications FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));

-- Function: pick qualifying plan from totals
CREATE OR REPLACE FUNCTION public.qualifying_plan_id(_total_rooms integer, _total_properties integer)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.subscription_plans
  WHERE _total_rooms >= min_rooms
    AND (max_rooms IS NULL OR _total_rooms <= max_rooms)
    AND (max_properties IS NULL OR _total_properties <= max_properties)
  ORDER BY sort_order ASC LIMIT 1;
$$;

-- Function: recalc subscription tier for a business
CREATE OR REPLACE FUNCTION public.recalc_subscription_tier(_business_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  total_rooms integer;
  total_props integer;
  qual_plan_id uuid;
  cur_plan_id uuid;
  cur_sort integer;
  qual_sort integer;
BEGIN
  SELECT COALESCE(SUM(room_count),0), COUNT(*) INTO total_rooms, total_props
  FROM public.properties WHERE business_id = _business_id AND active = true;

  -- fall back to at least small_stay
  qual_plan_id := public.qualifying_plan_id(GREATEST(total_rooms,1), GREATEST(total_props,1));
  IF qual_plan_id IS NULL THEN
    SELECT id INTO qual_plan_id FROM public.subscription_plans ORDER BY sort_order DESC LIMIT 1;
  END IF;

  SELECT plan_id INTO cur_plan_id FROM public.subscriptions WHERE business_id = _business_id;
  IF cur_plan_id IS NULL THEN RETURN; END IF;

  SELECT sort_order INTO cur_sort FROM public.subscription_plans WHERE id = cur_plan_id;
  SELECT sort_order INTO qual_sort FROM public.subscription_plans WHERE id = qual_plan_id;

  IF qual_sort > cur_sort THEN
    -- upgrade with 30-day grace
    UPDATE public.subscriptions
      SET pending_plan_id = qual_plan_id,
          grace_until = COALESCE(grace_until, now() + interval '30 days')
      WHERE business_id = _business_id
        AND (pending_plan_id IS DISTINCT FROM qual_plan_id);

    INSERT INTO public.plan_change_notifications
      (business_id, from_plan_id, to_plan_id, total_rooms, total_properties, message, effective_at)
    SELECT _business_id, cur_plan_id, qual_plan_id, total_rooms, total_props,
      'Congratulations! Your property has grown and now qualifies for the ' || sp.name || ' plan.',
      now() + interval '30 days'
    FROM public.subscription_plans sp WHERE sp.id = qual_plan_id
    AND NOT EXISTS (
      SELECT 1 FROM public.plan_change_notifications
      WHERE business_id = _business_id AND to_plan_id = qual_plan_id AND acknowledged_at IS NULL
    );
  ELSIF qual_sort < cur_sort THEN
    -- downgrades clear pending; do not auto-apply
    UPDATE public.subscriptions
      SET pending_plan_id = NULL, grace_until = NULL
      WHERE business_id = _business_id AND pending_plan_id IS NOT NULL;
  ELSE
    UPDATE public.subscriptions
      SET pending_plan_id = NULL, grace_until = NULL
      WHERE business_id = _business_id AND pending_plan_id IS NOT NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.properties_recalc_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.recalc_subscription_tier(COALESCE(NEW.business_id, OLD.business_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER properties_recalc_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.properties_recalc_trigger();

-- Auto-create Small Stay subscription on new business
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE small_id uuid;
BEGIN
  SELECT id INTO small_id FROM public.subscription_plans WHERE code = 'small_stay';
  INSERT INTO public.subscriptions (business_id, plan_id) VALUES (NEW.id, small_id)
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER businesses_default_subscription
AFTER INSERT ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();

-- Backfill subscriptions for existing businesses
INSERT INTO public.subscriptions (business_id, plan_id)
SELECT b.id, (SELECT id FROM public.subscription_plans WHERE code = 'small_stay')
FROM public.businesses b
LEFT JOIN public.subscriptions s ON s.business_id = b.id
WHERE s.id IS NULL;
