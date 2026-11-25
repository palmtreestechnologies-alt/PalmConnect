import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type SubscriptionInfo = {
  id: string;
  plan_id: string;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  payment_method: string | null;
  auto_renew: boolean;
  pending_plan_id: string | null;
  grace_until: string | null;
  current_period_end: string | null;
  manual_override: boolean;
};

export function useSubscription() {
  const { businessId } = useAuth();
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    const { data } = await supabase.from("subscriptions").select("*").eq("business_id", businessId).maybeSingle();
    setSub(data as any);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { reload(); }, [reload]);

  const now = Date.now();
  const trialEnds = sub?.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : null;
  const isTrialing = sub?.status === "trialing" && !!trialEnds;
  const daysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds - now) / 86_400_000)) : null;
  const trialExpired = isTrialing && trialEnds !== null && trialEnds < now;
  const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  // Paid period ended more than 3 days ago (matches the database rule).
  const lapsed = sub?.status === "active" && periodEnd !== null && periodEnd + 3 * 86_400_000 < now;
  const isReadOnly = !sub?.manual_override && (trialExpired || lapsed || ["expired", "cancelled", "past_due", "suspended"].includes(sub?.status ?? ""));
  const isPaid = sub?.status === "active" && !lapsed;

  return { sub, loading, reload, isTrialing, daysLeft, trialExpired, isReadOnly, isPaid };
}
