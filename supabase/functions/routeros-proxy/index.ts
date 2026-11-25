import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { assertPublicHost } from "../_shared/netguard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ConnParams = {
  host: string;
  port: number;
  username: string;
  password: string;
};

async function rosFetch(
  c: ConnParams,
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown; latencyMs: number }> {
  await assertPublicHost(c.host, c.port);
  const url = `https://${c.host}:${c.port}/rest${path}`;
  const auth = "Basic " + btoa(`${c.username}:${c.password}`);
  const start = performance.now();
  // RouterOS commonly ships with a self-signed cert. Deno fetch will fail TLS
  // validation in that case; we accept that as "unreachable" rather than
  // disabling cert checks globally.
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: auth,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw */
  }
  return { status: res.status, body, latencyMs: Math.round(performance.now() - start) };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json().catch(() => ({}));
    const action = String(payload.action ?? "");
    if (!action) return jsonResponse({ error: "missing action" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Resolve connection params either from request (test) or from DB (router_id).
    let conn: ConnParams | null = null;
    let routerRow: { id: string; business_id: string; name: string } | null = null;

    if (!authHeader.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
    {
      const guard = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: u, error: ue } = await guard.auth.getUser(authHeader.replace("Bearer ", ""));
      if (ue || !u?.user) return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (action === "test") {
      conn = {
        host: String(payload.host ?? ""),
        port: Number(payload.port ?? 443),
        username: String(payload.username ?? ""),
        password: String(payload.password ?? ""),
      };
      if (!conn.host || !conn.username || !conn.password) {
        return jsonResponse({ error: "host, username and password are required" }, 400);
      }
    } else {
      const routerId = String(payload.router_id ?? "");
      if (!routerId) return jsonResponse({ error: "router_id required" }, 400);
      // Use caller's JWT so RLS gates access to the router row.
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data, error } = await userClient
        .from("routers")
        .select("id, business_id, name, host, api_port, username")
        .eq("id", routerId)
        .maybeSingle();
      if (error || !data) return jsonResponse({ error: "router not found" }, 404);
      const srPw = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: pw } = await srPw.from("routers").select("password_encrypted").eq("id", data.id).maybeSingle();
      routerRow = { id: data.id, business_id: data.business_id, name: data.name };
      conn = {
        host: data.host,
        port: data.api_port,
        username: data.username,
        password: pw?.password_encrypted ?? "",
      };
    }

    try {
      switch (action) {
        case "test": {
          const r = await rosFetch(conn!, "/system/resource");
          if (r.status !== 200) {
            return jsonResponse({
              ok: false,
              message: r.status === 401 ? "Authentication failed" : `RouterOS responded ${r.status}`,
            });
          }
          const b = r.body as Record<string, string>;
          return jsonResponse({
            ok: true,
            latencyMs: r.latencyMs,
            identity: b["board-name"] ?? conn!.host,
            version: b.version ?? "unknown",
            board: b["board-name"] ?? "unknown",
          });
        }
        case "resource": {
          const r = await rosFetch(conn!, "/system/resource");
          if (r.status !== 200) return jsonResponse({ error: `status ${r.status}` }, 502);
          return jsonResponse({ ok: true, data: r.body, latencyMs: r.latencyMs });
        }
        case "active_sessions": {
          const r = await rosFetch(conn!, "/ip/hotspot/active");
          if (r.status !== 200) return jsonResponse({ error: `status ${r.status}` }, 502);
          return jsonResponse({ ok: true, data: r.body, router: routerRow });
        }
        case "disconnect": {
          const sessionId = String(payload.session_id ?? "");
          if (!sessionId) return jsonResponse({ error: "session_id required" }, 400);
          const r = await rosFetch(conn!, `/ip/hotspot/active/${encodeURIComponent(sessionId)}`, {
            method: "DELETE",
          });
          return jsonResponse({ ok: r.status >= 200 && r.status < 300, status: r.status });
        }
        case "sync_user": {
          const u = payload.user as {
            name: string;
            password: string;
            profile?: string;
            "mac-address"?: string;
          };
          if (!u?.name || !u?.password) return jsonResponse({ error: "user.name and user.password required" }, 400);
          const r = await rosFetch(conn!, "/ip/hotspot/user", {
            method: "PUT",
            body: JSON.stringify(u),
          });
          return jsonResponse({ ok: r.status >= 200 && r.status < 300, status: r.status, body: r.body });
        }
        default:
          return jsonResponse({ error: `unknown action ${action}` }, 400);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Most TLS / DNS / connect errors land here.
      return jsonResponse({
        ok: false,
        message: msg.includes("certificate")
          ? "TLS error — router is using a self-signed certificate the edge runtime won't trust"
          : msg.includes("dns") || msg.includes("name")
            ? "Could not resolve host"
            : `Could not reach router: ${msg}`,
      });
    }
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
