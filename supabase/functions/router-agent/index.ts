import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { buildSetupScript, formatPull, parseUptime } from "../_shared/routerscript.ts";

// Public endpoints called by the MikroTik itself (no browser JWT): auth is the one-time token or the router's agent key.
//   GET /router-agent/setup?t=<token>      -> RouterOS script (consumes the token, issues the agent key)
//   GET /router-agent/sync?id=..&c=..      -> header X-Agent-Key; ack + health in, changes out (text)

const text = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

const failScript = (msg: string) =>
  text(`:log error "Palm Connect: ${msg}"\n:put "Palm Connect: ${msg}"\n:error "${msg}"\n`);

const intOrNull = (v: string | null) => (v !== null && /^\d{1,12}$/.test(v) ? Number(v) : null);

Deno.serve(async (req) => {
  if (req.method !== "GET") return text("method not allowed", 405);
  const url = new URL(req.url);
  const route = url.pathname.replace(/\/+$/, "").split("/").pop();
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const baseUrl = `${Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "")}/functions/v1/router-agent`;

  if (route === "setup") {
    const token = url.searchParams.get("t") ?? "";
    const { data, error } = await supabase.rpc("consume_provisioning_token", { _token: token });
    if (error) { console.error("consume failed", error.message); return failScript("setup is unavailable, try again shortly"); }
    if (!data) return failScript("this setup command has expired or was already used. Create a new one in your dashboard");
    try {
      return text(buildSetupScript({
        baseUrl, routerId: data.router_id, agentKey: data.key, routerName: data.name,
        iface: data.interface, cidr: data.cidr,
      }));
    } catch (e) {
      console.error("script build failed", (e as Error).message);
      return failScript("this router's settings are invalid. Edit the router in your dashboard and create a new command");
    }
  }

  if (route === "sync") {
    const id = url.searchParams.get("id") ?? "";
    const key = req.headers.get("x-agent-key") ?? "";
    if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f]{64}$/.test(key)) return text("unauthorized", 401);
    const q = url.searchParams;
    const health = {
      cpu: intOrNull(q.get("cpu")), tm: intOrNull(q.get("tm")), fm: intOrNull(q.get("fm")),
      up: parseUptime(q.get("up") ?? ""), au: intOrNull(q.get("au")),
      ver: (q.get("ver") ?? "").replace(/[^0-9A-Za-z.\-]/g, "").slice(0, 20),
      bd: (q.get("bd") ?? "").replace(/[^0-9A-Za-z.\-]/g, "").slice(0, 40),
    };
    const { data: acked, error: ackErr } = await supabase.rpc("agent_ack", {
      _router_id: id, _key: key, _seq: intOrNull(q.get("c")) ?? 0, _health: health,
    });
    if (ackErr) { console.error("ack failed", ackErr.message); return text("error", 500); }
    if (!acked) return text("unauthorized", 401);
    const { data: pull, error: pullErr } = await supabase.rpc("agent_pull", { _router_id: id, _key: key });
    if (pullErr || !pull) { console.error("pull failed", pullErr?.message); return text("error", 500); }
    return text(formatPull(pull));
  }

  return text("not found", 404);
});
