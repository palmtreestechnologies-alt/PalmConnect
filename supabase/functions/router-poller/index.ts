import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { assertPublicHost } from "../_shared/netguard.ts";
import { safeEqual } from "../_shared/mpesa.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Polls every router across every business and writes a router_health snapshot.
// Triggered on a cron schedule (see supabase/config.toml) or invoked manually.

async function rosFetch(host: string, port: number, username: string, password: string, path: string) {
  await assertPublicHost(host, port);
  const url = `https://${host}:${port}/rest${path}`;
  const auth = "Basic " + btoa(`${username}:${password}`);
  const start = performance.now();
  const res = await fetch(url, {
    headers: { Authorization: auth, Accept: "application/json" },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep null */
  }
  return { status: res.status, body, latencyMs: Math.round(performance.now() - start) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Only the scheduler (which knows CRON_SECRET) may trigger a poll. Fail closed if unset.
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (!cronSecret || !safeEqual(provided, cronSecret)) {
    return new Response("forbidden", { status: 403 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: routers, error } = await admin
    .from("routers")
    .select("id, business_id, name, host, api_port, username, password_encrypted, status")
    .eq("connection_mode", "api");

  // Agent routers call in themselves; no call for 3 minutes means offline.
  await admin
    .from("routers")
    .update({ status: "offline" })
    .eq("connection_mode", "agent")
    .eq("status", "online")
    .lt("last_seen_at", new Date(Date.now() - 3 * 60_000).toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<Record<string, unknown>> = [];

  for (const r of routers ?? []) {
    let snapshot: Record<string, unknown> = {
      router_id: r.id,
      business_id: r.business_id,
      reachable: false,
      error_message: null as string | null,
    };
    let nextStatus = "offline";

    try {
      const resource = await rosFetch(
        r.host,
        r.api_port,
        r.username,
        r.password_encrypted ?? "",
        "/system/resource",
      );
      if (resource.status === 200 && resource.body && typeof resource.body === "object") {
        const b = resource.body as Record<string, string>;
        const memTotal = Number(b["total-memory"] ?? 0);
        const memFree = Number(b["free-memory"] ?? 0);
        const memUsedPct = memTotal > 0 ? Math.round(((memTotal - memFree) / memTotal) * 100) : null;
        snapshot = {
          ...snapshot,
          reachable: true,
          cpu_load: Number(b["cpu-load"] ?? 0),
          memory_used_pct: memUsedPct,
          uptime_seconds: parseUptime(b.uptime ?? ""),
          firmware: b.version ?? null,
          board_name: b["board-name"] ?? null,
        };
        nextStatus = "online";

        // Active users count
        try {
          const active = await rosFetch(
            r.host,
            r.api_port,
            r.username,
            r.password_encrypted ?? "",
            "/ip/hotspot/active",
          );
          if (active.status === 200 && Array.isArray(active.body)) {
            snapshot.active_users = active.body.length;
          }
        } catch {
          /* non-fatal */
        }
      } else {
        snapshot.error_message = `RouterOS responded ${resource.status}`;
      }
    } catch (err) {
      snapshot.error_message = err instanceof Error ? err.message : String(err);
    }

    await admin.from("router_health").insert(snapshot);

    if (r.status !== nextStatus) {
      await admin
        .from("routers")
        .update({ status: nextStatus, last_seen_at: nextStatus === "online" ? new Date().toISOString() : undefined })
        .eq("id", r.id);
      await admin.from("audit_logs").insert({
        action: nextStatus === "online" ? "router.online" : "router.offline",
        entity: "router",
        entity_id: r.id,
        business_id: r.business_id,
        metadata: { name: r.name, error: snapshot.error_message ?? null },
      });
    } else if (nextStatus === "online") {
      await admin.from("routers").update({ last_seen_at: new Date().toISOString() }).eq("id", r.id);
    }

    results.push({ id: r.id, status: nextStatus, error: snapshot.error_message });
  }

  return new Response(JSON.stringify({ ok: true, polled: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// Parses RouterOS uptime strings like "3d4h12m31s" into seconds.
function parseUptime(s: string): number {
  const re = /(\d+)([wdhms])/g;
  const mult: Record<string, number> = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };
  let total = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    total += Number(m[1]) * (mult[m[2]] ?? 0);
  }
  return total;
}
