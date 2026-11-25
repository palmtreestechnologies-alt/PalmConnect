import { createClient } from "npm:@supabase/supabase-js@2";
import { credsForPayment, stkQuery } from "../_shared/mpesa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get("ref");
    if (!ref) return json({ error: "ref required" }, 400);

    const sr = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!/^ws_CO_[A-Za-z0-9_]{8,60}$/.test(ref)) return json({ status: "unknown" }, 200);

    let { data: pay } = await sr.from("payments")
      .select("id, business_id, package_id, status, failure_reason, voucher_id, amount_cents, created_at, metadata")
      .eq("provider_ref", ref).maybeSingle();

    if (!pay) return json({ status: "unknown" }, 200);

    // Reconcile: if the callback never arrived, ask Safaricom directly after 25 seconds.
    if (pay.status === "pending" && Date.now() - new Date(pay.created_at).getTime() > 25_000) {
      const found = credsForPayment(sr, pay);
      if (found) {
        try {
          const q = await stkQuery(found.env, found.cred, ref);
          if (q.paid) {
            const { data: won } = await sr.from("payments").update({ status: "paid", paid_at: new Date().toISOString() })
              .eq("id", pay.id).eq("status", "pending").select("id");
            if (won?.length && (pay.metadata as any)?.kind === "subscription") {
              await sr.rpc("activate_subscription_payment", { _payment_id: pay.id });
            }
          } else if (q.resultCode && q.resultCode !== "0" && q.resultCode !== "4999") {
            await sr.from("payments").update({ status: q.resultCode === "1032" ? "cancelled" : "failed", failure_reason: q.resultDesc })
              .eq("id", pay.id).eq("status", "pending");
          }
        } catch (e) { console.error("payment-status reconcile failed", (e as Error).message); }
        const r = await sr.from("payments")
          .select("id, business_id, package_id, status, failure_reason, voucher_id, amount_cents, created_at, metadata")
          .eq("id", pay.id).maybeSingle();
        if (r.data) pay = r.data;
      }
    }

    return json({
      status: pay.status,
      failure_reason: pay.failure_reason,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
