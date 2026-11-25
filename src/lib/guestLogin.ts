import { supabase } from "@/integrations/supabase/client";

// Helpers for the one-step guest registration (phone + devices + stay).

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L: easy to read out and type

// Cryptographically random, unbiased picks (never Math.random for credentials).
export function randomCode(n: number, alphabet = ALPHABET) {
  const limit = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < n) {
    const buf = new Uint8Array(n * 2);
    crypto.getRandomValues(buf);
    for (const b of buf) if (b < limit && out.length < n) out += alphabet[b % alphabet.length];
  }
  return out;
}

export const generateUsername = () => "PT" + randomCode(6);
export const generatePassword = () => randomCode(6);

/** Digits only, international form. A leading 0 or a bare 7xx/1xx number is read as Kenyan (254). */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^\d]/g, "");
  if (raw.trim().startsWith("00")) d = d.slice(2);
  if (/^0[17]\d{8}$/.test(d)) d = "254" + d.slice(1);
  else if (/^[17]\d{8}$/.test(d)) d = "254" + d;
  return /^\d{9,15}$/.test(d) ? d : null;
}

export type StayUnit = "hours" | "days";
export function stayToMs(amount: number, unit: StayUnit) {
  return amount * (unit === "days" ? 24 : 1) * 3600_000;
}
export const STAY_LIMITS = { hours: 72, days: 90 } as const;

export const SPEED_OPTIONS = [
  { value: "none", label: "No limit", kbps: null },
  { value: "1024", label: "1 Mbps", kbps: 1024 },
  { value: "2048", label: "2 Mbps", kbps: 2048 },
  { value: "5120", label: "5 Mbps", kbps: 5120 },
  { value: "10240", label: "10 Mbps", kbps: 10240 },
  { value: "20480", label: "20 Mbps", kbps: 20480 },
] as const;

const SMS_ERRORS: Record<string, string> = {
  no_credits: "You have no SMS credits left. Tap Buy SMS on the Vouchers page to top up.",
  sms_not_configured: "SMS is not switched on yet. Use Copy or WhatsApp for now.",
  no_phone: "This login has no phone number.",
  expired: "This login has already expired.",
  limit_voucher: "This login has already been texted 3 times.",
  limit_daily: "Daily SMS limit reached. Try again tomorrow.",
  provider_failed: "The SMS could not be delivered. Check the number and try again.",
};

/** Texts the guest their login. Returns an error message, or null on success. */
export async function sendGuestSms(voucherId: string): Promise<string | null> {
  const { error } = await supabase.functions.invoke("send-guest-sms", { body: { voucher_id: voucherId } });
  if (!error) return null;
  let code = "";
  try { code = (await (error as any).context.json()).error ?? ""; } catch { /* network error */ }
  return SMS_ERRORS[code] ?? "Could not send the SMS. Please try again.";
}
