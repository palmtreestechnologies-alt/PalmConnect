import { createClient } from "npm:@supabase/supabase-js@2";

// Sends a guest's Wi-Fi login by SMS through Africa's Talking.
// Secrets: AT_USERNAME, AT_API_KEY, optional AT_SENDER_ID. Palm Trees pays for the SMS.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_PER_VOUCHER = 3;
const MAX_PER_BUSINESS_PER_DAY = 200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const body = await req.json().catch(() => ({}));
    const voucherId = String(body.voucher_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(voucherId)) return json({ error: "voucher_id required" }, 400);

    // Row-level security on the caller's own token decides which vouchers they may read.
    const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: v } = await user.from("vouchers")
      .select("id, business_id, username, password, guest_phone, device_limit, expires_at, status")
      .eq("id", voucherId).maybeSingle();
    if (!v) return json({ error: "not_found" }, 404);
    if (!v.guest_phone) return json({ error: "no_phone" }, 400);
    if (v.status === "expired") return json({ error: "expired" }, 400);

    const atUser = Deno.env.get("AT_USERNAME"), atKey = Deno.env.get("AT_API_KEY");
    if (!atUser || !atKey) return json({ error: "sms_not_configured" }, 503);

    const sr = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const [{ count: perVoucher }, { count: perDay }, { data: biz }] = await Promise.all([
      sr.from("sms_log").select("id", { count: "exact", head: true }).eq("voucher_id", v.id).eq("status", "sent"),
      sr.from("sms_log").select("id", { count: "exact", head: true }).eq("business_id", v.business_id).gte("created_at", since),
      sr.from("businesses").select("name").eq("id", v.business_id).maybeSingle(),
    ]);
    if ((perVoucher ?? 0) >= MAX_PER_VOUCHER) return json({ error: "limit_voucher" }, 429);
    if ((perDay ?? 0) >= MAX_PER_BUSINESS_PER_DAY) return json({ error: "limit_daily" }, 429);

    // One credit per SMS, taken before sending and returned if the provider fails.
    const { data: reserved } = await sr.rpc("sms_reserve", { _business_id: v.business_id });
    if (!reserved) return json({ error: "no_credits" }, 402);

    const until = v.expires_at
      ? new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Nairobi", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
          .format(new Date(v.expires_at))
      : "";
    const name = String(biz?.name ?? "Wi-Fi").slice(0, 30);
    const message =
      `${name} Wi-Fi\nUser: ${v.username}\nPass: ${v.password}\nDevices: ${v.device_limit ?? 1}` +
      (until ? `\nValid until ${until}` : "");
    const to = `+${v.guest_phone}`;

    const form = new URLSearchParams({ username: atUser, to, message });
    const sender = Deno.env.get("AT_SENDER_ID");
    if (sender) form.set("from", sender);
    const base = atUser === "sandbox" ? "https://api.sandbox.africastalking.com" : "https://api.africastalking.com";
    let res: Response;
    try {
      res = await fetch(`${base}/version1/messaging`, {
        method: "POST",
        headers: { apiKey: atKey, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
      });
    } catch (e) {
      await sr.rpc("sms_refund", { _business_id: v.business_id });
      throw e;
    }
    const out = await res.json().catch(() => ({}));
    const rec = out?.SMSMessageData?.Recipients?.[0];
    const ok = res.ok && rec && /^(Success|Sent)/i.test(String(rec.status));
    await sr.from("sms_log").insert({
      business_id: v.business_id, voucher_id: v.id, phone: v.guest_phone,
      status: ok ? "sent" : "failed", detail: String(rec?.status ?? res.status).slice(0, 200),
    });
    if (!ok) await sr.rpc("sms_refund", { _business_id: v.business_id });
    if (!ok) return json({ error: "provider_failed", detail: String(rec?.status ?? res.status) }, 502);
    return json({ sent: true });
  } catch (e) {
    console.error("send-guest-sms", e);
    return json({ error: "server_error" }, 500);
  }
});
