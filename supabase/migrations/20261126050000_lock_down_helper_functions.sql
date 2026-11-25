-- Trigger-only and internal functions: nobody calls these over the API.
REVOKE ALL ON FUNCTION public.create_default_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_business_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.properties_recalc_trigger() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_subscription_tier(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.qualifying_plan_id(integer, integer) FROM PUBLIC, anon, authenticated;

-- Used inside RLS policies, so signed-in users need EXECUTE, anonymous visitors do not.
REVOKE ALL ON FUNCTION public.is_account_readonly(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_account_readonly(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_org_role(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, text) TO authenticated, service_role;

ALTER FUNCTION public.bump_voucher_seq() SET search_path = public;
