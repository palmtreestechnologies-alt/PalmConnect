import { createClient } from "npm:@supabase/supabase-js@2";
import { baseUrl, darajaTimestamp, getAccessToken, platformCreds } from "../_shared/mpesa.ts";

// Business owner buys an SMS bundle from Palm Trees via STK push to Palm Trees' paybill.
// Amount comes from the sms_packs table, never from the client. Credits are added by activate_sms_payment.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

function normalizePhone(raw: string): string | null {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("254") && d.length === 12) return d;
  if (d.startsWith("0") && d.length === 10) return "254" + d.slice(1);
  if ((d.startsWith("7") || d.startsWith("1")) && d.length === 9) return "254" + d;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ ok: false, message: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: ue } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (ue || !u?.user) return json({ ok: false, message: "Unauthorized" }, 401);

    const sr = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const callbackSecret = Deno.env.get("MPESA_CALLBACK_SECRET") ?? "";
    const platform = platformCreds();
    if (!callbackSecret || !platform) {
      console.error("subscription-checkout: platform M-Pesa or callback secret not configured");
      return json({ ok: false, message: "Payments are temporarily unavailable" }, 503);
    }

    // Caller must own a business.
    const { data: biz } = await userClient.rpc("get_user_business_id", { _user_id: u.user.id });
    const { data: isOwner } = await userClient.rpc("has_role", { _user_id: u.user.id, _role: "business_owner" });
    if (!biz || !isOwner) return json({ ok: false, message: "Only the business owner can pay" }, 403);

    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body?.phone);
    if (!phone) return json({ ok: false, message: "Enter a valid Kenyan M-Pesa number" }, 400);

    const { data: pack } = await sr.from("sms_packs").select("id, name, code, credits, price_cents")
      .eq("code", String(body?.pack_code ?? "")).eq("active", true).maybeSingle();
    if (!pack || pack.price_cents < 100) return json({ ok: false, message: "Bundle unavailable" }, 400);

    // At most 3 attempts per 10 minutes per business.
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await sr.from("payments").select("id", { count: "exact", head: true })
      .eq("business_id", biz).gte("created_at", since).filter("metadata->>kind", "eq", "sms_pack");
    if ((count ?? 0) >= 3) return json({ ok: false, message: "Too many attempts. Try again in a few minutes." }, 429);

    const { env, cred, type } = platform;
    const token = await getAccessToken(env, cred.consumer_key, cred.consumer_secret).catch((e) => {
      console.error("oauth", (e as Error).message); return null;
    });
    if (!token) return json({ ok: false, message: "Payment provider unavailable. Please try again." }, 502);

    const ts = darajaTimestamp();
    const amount = Math.floor(pack.price_cents / 100);
    const stk = await fetch(`${baseUrl(env)}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: cred.shortcode,
        Password: btoa(`${cred.shortcode}${cred.passkey}${ts}`),
        Timestamp: ts,
        TransactionType: type === "till" ? "CustomerBuyGoodsOnline" : "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: cred.shortcode,
        PhoneNumber: phone,
        CallBackURL: `${SUPABASE_URL}/functions/v1/mpesa-callback?t=${encodeURIComponent(callbackSecret)}`,
        AccountReference: `SMS${pack.code}`.slice(0, 12),
        TransactionDesc: `PalmConnect ${pack.name}`.slice(0, 20),
      }),
    });
    const d = await stk.json().catch(() => null);
    if (!stk.ok || d?.ResponseCode !== "0") {
      console.error("sms stk failed", d?.errorMessage || d?.ResponseDescription || stk.status);
      return json({ ok: false, message: "Could not start the M-Pesa prompt. Check the number and try again." }, 502);
    }

    await sr.from("payments").insert({
      business_id: biz, provider: "mpesa", provider_ref: d.CheckoutRequestID, phone,
      amount_cents: pack.price_cents, currency: "KES", status: "pending",
      metadata: { kind: "sms_pack", environment: env, pack_id: pack.id, pack_name: pack.name, credits: pack.credits },
    });
    return json({ ok: true, checkout_request_id: d.CheckoutRequestID, amount, credits: pack.credits });
  } catch (e) {
    console.error("sms-checkout", (e as Error).message);
    return json({ ok: false, message: "Internal error" }, 500);
  }
});
