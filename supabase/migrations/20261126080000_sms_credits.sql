-- SMS bundles: a business buys SMS credits from Palm Trees (M-Pesa, central paybill). 1 SMS = 1 credit.

CREATE TABLE IF NOT EXISTS public.sms_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  price_cents INTEGER NOT NULL CHECK (price_cents >= 100),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.sms_packs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_packs FROM anon, authenticated;
GRANT SELECT ON public.sms_packs TO authenticated;
CREATE POLICY "Anyone signed in sees packs" ON public.sms_packs FOR SELECT TO authenticated USING (active);
CREATE POLICY "Super admin sees all packs" ON public.sms_packs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- PLACEHOLDER prices (KSh 1.50 / 1.30 / 1.20 per SMS). Confirm before launch.
INSERT INTO public.sms_packs (code, name, credits, price_cents, sort_order) VALUES
  ('sms100',  '100 SMS',  100,  15000, 1),
  ('sms500',  '500 SMS',  500,  65000, 2),
  ('sms2000', '2,000 SMS', 2000, 240000, 3)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.sms_balance (
  business_id UUID PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_balance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_balance FROM anon, authenticated;
GRANT SELECT ON public.sms_balance TO authenticated;
CREATE POLICY "Biz sees own sms balance" ON public.sms_balance FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE IF NOT EXISTS public.sms_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('purchase','grant','send','refund')),
  payment_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One credit entry per payment, so a repeated M-Pesa callback can never credit twice.
CREATE UNIQUE INDEX IF NOT EXISTS sms_ledger_one_per_payment ON public.sms_credit_ledger (payment_id) WHERE reason = 'purchase';
ALTER TABLE public.sms_credit_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sms_credit_ledger FROM anon, authenticated;
GRANT SELECT ON public.sms_credit_ledger TO authenticated;
CREATE POLICY "Biz sees own sms ledger" ON public.sms_credit_ledger FOR SELECT TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'));

-- Take one credit, atomically. False when the balance is empty.
CREATE OR REPLACE FUNCTION public.sms_reserve(_business_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.sms_balance SET credits = credits - 1, updated_at = now() WHERE business_id = _business_id AND credits > 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 1 THEN INSERT INTO public.sms_credit_ledger (business_id, delta, reason) VALUES (_business_id, -1, 'send'); END IF;
  RETURN n = 1;
END; $$;

-- Give the credit back when the provider could not send the message.
CREATE OR REPLACE FUNCTION public.sms_refund(_business_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.sms_balance SET credits = credits + 1, updated_at = now() WHERE business_id = _business_id;
  INSERT INTO public.sms_credit_ledger (business_id, delta, reason, note) VALUES (_business_id, 1, 'refund', 'send failed');
END; $$;

-- A paid SMS bundle adds its credits, once.
CREATE OR REPLACE FUNCTION public.activate_sms_payment(_payment_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; pack record;
BEGIN
  SELECT * INTO p FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND OR p.status <> 'paid' OR (p.metadata->>'kind') IS DISTINCT FROM 'sms_pack' THEN RETURN false; END IF;
  SELECT * INTO pack FROM public.sms_packs WHERE id = (p.metadata->>'pack_id')::uuid;
  IF NOT FOUND THEN RETURN false; END IF;
  BEGIN
    INSERT INTO public.sms_credit_ledger (business_id, delta, reason, payment_id) VALUES (p.business_id, pack.credits, 'purchase', p.id);
  EXCEPTION WHEN unique_violation THEN RETURN false;
  END;
  INSERT INTO public.sms_balance (business_id, credits) VALUES (p.business_id, pack.credits)
  ON CONFLICT (business_id) DO UPDATE SET credits = public.sms_balance.credits + EXCLUDED.credits, updated_at = now();
  RETURN true;
END; $$;

-- Platform staff can grant credits by hand (testing, goodwill).
CREATE OR REPLACE FUNCTION public.admin_grant_sms(_business_id uuid, _credits int, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _credits IS NULL OR _credits < 1 OR _credits > 100000 THEN RAISE EXCEPTION 'credits must be 1 to 100000'; END IF;
  INSERT INTO public.sms_credit_ledger (business_id, delta, reason, note) VALUES (_business_id, _credits, 'grant', left(_note, 200));
  INSERT INTO public.sms_balance (business_id, credits) VALUES (_business_id, _credits)
  ON CONFLICT (business_id) DO UPDATE SET credits = public.sms_balance.credits + EXCLUDED.credits, updated_at = now();
END; $$;

REVOKE ALL ON FUNCTION public.sms_reserve(uuid), public.sms_refund(uuid), public.activate_sms_payment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sms_reserve(uuid), public.sms_refund(uuid), public.activate_sms_payment(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.admin_grant_sms(uuid, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_sms(uuid, int, text) TO authenticated;
