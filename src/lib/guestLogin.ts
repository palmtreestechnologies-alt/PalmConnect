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
