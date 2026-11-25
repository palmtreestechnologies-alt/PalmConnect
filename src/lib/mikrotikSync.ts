// Mock MikroTik RouterOS v7 hotspot user sync.
// In v1 there is no real router connection; this simulates pushing a
// per-user hotspot profile (rate-limit, session-timeout, idle-timeout,
// data cap) so the UI flow and DB sync_status are production-shaped.
//
// When real RouterOS REST integration lands, replace simulateSync with
// a call to an edge function that hits /rest/ip/hotspot/user and
// /rest/ip/hotspot/user/profile on the target router.

import { supabase } from "@/integrations/supabase/client";

export type StaffLimits = {
  download_kbps: number | null;
  upload_kbps: number | null;
  session_timeout_minutes: number | null;
  idle_timeout_minutes: number | null;
  data_limit_mb: number | null;
};

export function buildRateLimit(l: StaffLimits): string | null {
  if (!l.upload_kbps && !l.download_kbps) return null;
  const up = l.upload_kbps ? `${l.upload_kbps}k` : "0";
  const dn = l.download_kbps ? `${l.download_kbps}k` : "0";
  return `${up}/${dn}`;
}

export function buildMikrotikPayload(opts: {
  username: string;
  password: string;
  mac_address: string | null;
  limits: StaffLimits;
}) {
  const rate = buildRateLimit(opts.limits);
  return {
    name: opts.username,
    password: opts.password,
    "mac-address": opts.mac_address || undefined,
    "rate-limit": rate || undefined,
    "session-timeout": opts.limits.session_timeout_minutes
      ? `${opts.limits.session_timeout_minutes * 60}s`
      : undefined,
    "idle-timeout": opts.limits.idle_timeout_minutes
      ? `${opts.limits.idle_timeout_minutes * 60}s`
      : undefined,
    "limit-bytes-total": opts.limits.data_limit_mb
      ? opts.limits.data_limit_mb * 1024 * 1024
      : undefined,
  };
}

export async function syncStaffToRouter(staffId: string): Promise<{ ok: boolean; error?: string }> {
  // Simulate network round-trip
  await new Promise((r) => setTimeout(r, 600));

  const { error } = await supabase
    .from("staff_wifi_access")
    .update({ sync_status: "synced", last_synced_at: new Date().toISOString() })
    .eq("id", staffId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
