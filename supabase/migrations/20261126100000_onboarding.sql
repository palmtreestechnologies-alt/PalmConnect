-- Onboarding: Google sign-ups get a placeholder business; the Welcome page collects the real details.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS onboarding_answers jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Everyone who already has a business has been through sign-up; do not interrupt them.
UPDATE public.businesses SET onboarded_at = COALESCE(onboarded_at, created_at) WHERE onboarded_at IS NULL;

-- Email sign-ups supply business details on the form, so they are onboarded from the start.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_business_id UUID;
  biz_name TEXT;
  biz_type public.business_type;
  provided BOOLEAN;
BEGIN
  provided := NULLIF(trim(NEW.raw_user_meta_data->>'business_name'), '') IS NOT NULL;
  biz_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'business_name'), ''), 'My Business');
  BEGIN
    biz_type := COALESCE((NEW.raw_user_meta_data->>'business_type')::public.business_type, 'restaurant');
  EXCEPTION WHEN invalid_text_representation THEN
    biz_type := 'restaurant';
  END;

  INSERT INTO public.businesses (name, type, email, phone, onboarded_at)
  VALUES (biz_name, biz_type, NEW.email, NEW.raw_user_meta_data->>'phone', CASE WHEN provided THEN now() END)
  RETURNING id INTO new_business_id;

  INSERT INTO public.profiles (id, business_id, full_name, email, phone)
  VALUES (NEW.id, new_business_id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
          NEW.email,
          NEW.raw_user_meta_data->>'phone');

  INSERT INTO public.user_roles (user_id, role, business_id)
  VALUES (NEW.id, 'business_owner', new_business_id);

  RETURN NEW;
END;
$$;
