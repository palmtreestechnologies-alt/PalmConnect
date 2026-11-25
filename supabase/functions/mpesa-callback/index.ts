import { createClient } from "npm:@supabase/supabase-js@2";
import { credsForPayment, safeEqual, stkQuery } from "../_shared/mpesa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CALLBACK_SECRET = Deno.env.get("MPESA_CALLBACK_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ack = () =>
    new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // 1. Caller must know the secret embedded in the callback URL we gave Safaricom.
  //    If the secret is not configured, refuse everything (fail closed).
  const t = new URL(req.url).searchParams.get("t") ?? "";
  if (!CALLBACK_SECRET || !safeEqual(t, CALLBACK_SECRET)) {
    return new Response("forbidden", { status: 403 });
  }

  try {
    const body = await req.json().catch(() => null);
    const stk = body?.Body?.stkCallback;
    if (!stk || typeof stk.CheckoutRequestID !== "string") return ack();

    const ref = stk.CheckoutRequestID as string;
    const resultCode = Number(stk.ResultCode);
    const resultDesc = String(stk.ResultDesc ?? "").slice(0, 200);
    const items: Array<{ Name: string; Value: any }> = stk.CallbackMetadata?.Item ?? [];
    const get = (n: string) => items.find((i) => i.Name === n)?.Value;
    // Log only identifiers, never phone numbers or full payloads.
    console.log("mpesa-callback", JSON.stringify({ ref, resultCode }));

    const sr = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Only act on payments we created ourselves, and only while still pending (idempotent).
    const { data: pay } = await sr.from("payments")
      .select("id, business_id, status, amount_cents, metadata")
      .eq("provider_ref", ref).maybeSingle();
    if (!pay || pay.status !== "pending") return ack();

    if (resultCode !== 0) {
      await sr.from("payments").update({
        status: resultCode === 1032 ? "cancelled" : "failed",
        failure_reason: resultDesc,
      }).eq("id", pay.id).eq("status", "pending");
      return ack();
    }

    // 3. Amount must match what we asked for.
    const expectedAmount = Math.floor(pay.amount_cents / 100);
    const paidAmount = Number(get("Amount"));
    if (!Number.isFinite(paidAmount) || paidAmount < expectedAmount) {
      await sr.from("payments").update({
        status: "failed",
        failure_reason: "Amount mismatch",
        metadata: { ...(pay.metadata as any ?? {}), flagged: "amount_mismatch", reported_amount: paidAmount },
      }).eq("id", pay.id).eq("status", "pending");
      return ack();
    }

    // 4. Confirm with Safaricom directly using this business's credentials.
    const found = credsForPayment(sr, pay);
    if (!found) return ack();
    const { env, cred } = found;

    let confirmed = false;
    try {
      confirmed = (await stkQuery(env, cred, ref)).paid;
    } catch (e) {
      // Could not confirm: leave pending so the status poller / a retry can settle it.
      console.error("mpesa-callback stkQuery failed", (e as Error).message);
      return new Response("retry", { status: 503 });
    }
    if (!confirmed) {
      await sr.from("payments").update({
        metadata: { ...(pay.metadata as any ?? {}), flagged: "callback_not_confirmed" },
      }).eq("id", pay.id).eq("status", "pending");
      return ack();
    }

    // 5. Mark paid atomically; only the request that wins the update issues the voucher.
    const { data: updated } = await sr.from("payments").update({
      status: "paid",
      paid_at: new Date().toISOString(),
      metadata: {
        ...(pay.metadata as any ?? {}),
        mpesa_receipt: get("MpesaReceiptNumber"),
        transaction_date: get("TransactionDate"),
        amount: paidAmount,
        result_desc: resultDesc,
      },
    }).eq("id", pay.id).eq("status", "pending").select("id");

    if (updated?.length && (pay.metadata as any)?.kind === "subscription") {
      await sr.rpc("activate_subscription_payment", { _payment_id: pay.id });
    }
    if (updated?.length && (pay.metadata as any)?.kind === "sms_pack") {
      await sr.rpc("activate_sms_payment", { _payment_id: pay.id });
    }
    return ack();
  } catch (err) {
    console.error("mpesa-callback error", (err as Error).message);
    return ack();
  }
});
