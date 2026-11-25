// Shared Safaricom Daraja helpers used by mpesa-checkout and mpesa-callback.

export type MpesaEnv = "production" | "sandbox";

export function baseUrl(env: MpesaEnv) {
  return env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
}

export function darajaTimestamp(d = new Date()) {
  // Daraja expects East Africa Time (UTC+3) in YYYYMMDDHHmmss.
  const eat = new Date(d.getTime() + 3 * 3600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    eat.getUTCFullYear().toString() +
    p(eat.getUTCMonth() + 1) + p(eat.getUTCDate()) +
    p(eat.getUTCHours()) + p(eat.getUTCMinutes()) + p(eat.getUTCSeconds())
  );
}

export async function getAccessToken(env: MpesaEnv, consumerKey: string, consumerSecret: string) {
  const resp = await fetch(`${baseUrl(env)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${btoa(`${consumerKey}:${consumerSecret}`)}` },
  });
  const body = await resp.json().catch(() => null);
  if (!resp.ok || !body?.access_token) {
    throw new Error(`OAuth failed: ${body?.errorMessage || resp.status}`);
  }
  return body.access_token as string;
}

/** Asks Safaricom directly whether an STK push succeeded. Never trust the callback alone. */
export async function stkQuery(
  env: MpesaEnv,
  cred: { consumer_key: string; consumer_secret: string; passkey: string; shortcode: string },
  checkoutRequestId: string,
): Promise<{ paid: boolean; resultCode: string | null; resultDesc: string | null }> {
  const token = await getAccessToken(env, cred.consumer_key, cred.consumer_secret);
  const ts = darajaTimestamp();
  const resp = await fetch(`${baseUrl(env)}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: cred.shortcode,
      Password: btoa(`${cred.shortcode}${cred.passkey}${ts}`),
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const data = await resp.json().catch(() => null);
  const code = data?.ResultCode != null ? String(data.ResultCode) : null;
  return { paid: resp.ok && code === "0", resultCode: code, resultDesc: data?.ResultDesc ?? null };
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string) {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

export type Cred = { consumer_key: string; consumer_secret: string; passkey: string; shortcode: string };

/** Palm Trees' own paybill, used for subscription payments. Kept in function secrets, never in the database. */
export function platformCreds(): { env: MpesaEnv; cred: Cred; type: "paybill" | "till" } | null {
  const g = (k: string) => Deno.env.get(k) ?? "";
  const cred = {
    consumer_key: g("PALMTREES_MPESA_CONSUMER_KEY"),
    consumer_secret: g("PALMTREES_MPESA_CONSUMER_SECRET"),
    passkey: g("PALMTREES_MPESA_PASSKEY"),
    shortcode: g("PALMTREES_MPESA_SHORTCODE"),
  };
  if (!cred.consumer_key || !cred.consumer_secret || !cred.passkey || !cred.shortcode) return null;
  const env: MpesaEnv = g("PALMTREES_MPESA_ENV") === "production" ? "production" : "sandbox";
  return { env, cred, type: g("PALMTREES_MPESA_TYPE") === "till" ? "till" : "paybill" };
}

/** Credentials used to confirm a payment. All payments are subscription payments to Palm Trees. */
// deno-lint-ignore no-explicit-any
export function credsForPayment(_sr: unknown, pay: { metadata: any }): { env: MpesaEnv; cred: Cred } | null {
  if (pay.metadata?.kind !== "subscription") return null;
  const p = platformCreds();
  return p ? { env: p.env, cred: p.cred } : null;
}
