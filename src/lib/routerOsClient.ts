import { supabase } from "@/integrations/supabase/client";

export type TestConnectionResult =
  | { ok: true; latencyMs: number; identity: string; version: string; board: string }
  | { ok: false; message: string };

export async function testRouterConnection(params: {
  host: string;
  port: number;
  username: string;
  password: string;
}): Promise<TestConnectionResult> {
  const { data, error } = await supabase.functions.invoke("routeros-proxy", {
    body: { action: "test", ...params },
  });
  if (error) return { ok: false, message: error.message };
  return data as TestConnectionResult;
}

export type LiveResource = {
  ok: true;
  data: Record<string, string>;
  latencyMs: number;
};

export async function fetchRouterResource(routerId: string) {
  const { data, error } = await supabase.functions.invoke("routeros-proxy", {
    body: { action: "resource", router_id: routerId },
  });
  if (error || !data?.ok) return null;
  return data as LiveResource;
}

export type LiveSession = {
  ".id": string;
  user: string;
  address: string;
  "mac-address": string;
  uptime: string;
  "bytes-in": string;
  "bytes-out": string;
  server?: string;
};

export async function fetchActiveSessions(routerId: string): Promise<LiveSession[]> {
  const { data, error } = await supabase.functions.invoke("routeros-proxy", {
    body: { action: "active_sessions", router_id: routerId },
  });
  if (error || !data?.ok) return [];
  return (data.data as LiveSession[]) ?? [];
}

export async function disconnectSession(routerId: string, sessionId: string) {
  const { data, error } = await supabase.functions.invoke("routeros-proxy", {
    body: { action: "disconnect", router_id: routerId, session_id: sessionId },
  });
  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean };
}

export function parseUptimeSeconds(s: string): number {
  const re = /(\d+)([wdhms])/g;
  const mult: Record<string, number> = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };
  let total = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) total += Number(m[1]) * (mult[m[2]] ?? 0);
  return total;
}
