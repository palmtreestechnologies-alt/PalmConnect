import { BRIDGE_IFACE, buildSetupScript, buildSyncSource, cidrPlan, formatPull, parseUptime, rosEscape, profileName } from "../functions/_shared/routerscript.ts";
let fails = 0;
const t = (n: string, ok: boolean, extra = "") => { console.log((ok ? "PASS  " : "FAIL  ") + n + (ok ? "" : " " + extra)); if (!ok) fails++; };
const eq = (n: string, a: unknown, b: unknown) => t(n, JSON.stringify(a) === JSON.stringify(b), `got ${JSON.stringify(a)} want ${JSON.stringify(b)}`);
eq("cidr /24", cidrPlan("192.168.88.0/24"), { network: "192.168.88.0", mask: 24, gateway: "192.168.88.1", poolStart: "192.168.88.10", poolEnd: "192.168.88.254" });
eq("cidr non-aligned host bits normalised", cidrPlan("10.5.5.77/24").network, "10.5.5.0");
eq("cidr /28", cidrPlan("172.16.1.16/28"), { network: "172.16.1.16", mask: 28, gateway: "172.16.1.17", poolStart: "172.16.1.26", poolEnd: "172.16.1.30" });
for (const bad of ["8.8.8.0/24", "192.168.1.0/29", "192.168.1.0/8", "300.1.1.1/24", "192.168.1.0", "172.32.0.0/16", "192.168.1.0/24; /system reset"]) {
  let threw = false; try { cidrPlan(bad); } catch { threw = true; } t("cidr rejects " + bad, threw);
}
eq("escape", rosEscape('a"b$c[d]e\\f?\n'), "a\\22b\\24c\\5Bd\\5De\\5Cf\\3F\\0A");
eq("uptime v6", parseUptime("1w2d03:04:05"), 604800 + 2 * 86400 + 3 * 3600 + 4 * 60 + 5);
eq("uptime v6 hms", parseUptime("03:04:05"), 3 * 3600 + 4 * 60 + 5);
eq("uptime v7", parseUptime("2d3h4m5s"), 2 * 86400 + 3 * 3600 + 4 * 60 + 5);
eq("uptime garbage", parseUptime("x; drop"), null);
const P = { baseUrl: "https://abc.supabase.co/functions/v1/router-agent", routerId: "11111111-2222-3333-4444-555555555555", agentKey: "a".repeat(64), routerName: 'Lobby "x"; /system reset', iface: "bridge-hs", cidr: "192.168.88.0/24" };
const s = buildSetupScript(P);
t("setup has interface check before any change", s.indexOf("interface find") < s.indexOf("backup save"));
t("setup takes backup before changes", s.indexOf("backup save") < s.indexOf("/ip pool add"));
t("router name is sanitised in comment", s.split("\n")[0] === "# Palm Connect setup for Lobby x system reset");
t("no raw key in url, key only in header", !s.includes("key=") );
t("no source line is longer than 460 chars", s.split("\n").every((l) => l.length < 460), String(Math.max(...s.split("\n").map((l) => l.length))));
t("every source continuation ends with backslash then quote closes", (s.match(/source="/g) ?? []).length === 1);
// unescaped quotes inside the source block would break the script
const block = s.slice(s.indexOf('source="') + 8, s.indexOf('"\n/system scheduler remove')); 
t("source block has no raw quote, dollar or bracket", !/["$\[\]]/.test(block.replace(/\\\n/g, "")));
for (const bad of [{ iface: 'x";/system reset' }, { iface: "a".repeat(16) }, { cidr: "8.8.8.0/24" }, { agentKey: "short" }, { baseUrl: "http://evil" }, { baseUrl: 'https://a.co"; /x' }]) {
  let threw = false; try { buildSetupScript({ ...P, ...bad }); } catch { threw = true; } t("setup rejects " + JSON.stringify(bad).slice(0, 40), threw);
}
const B = buildSetupScript({ ...P, iface: BRIDGE_IFACE });
t("bridge mode creates the bridge", B.includes("/interface bridge add name=palm-bridge"));
t("bridge mode skips the single-interface check", !B.includes("interface find name="));
t("bridge mode excludes ether1", B.includes('name!="ether1"'));
t("bridge mode adds ports after the scheduler and sync", B.indexOf("bridge port add") > B.indexOf("/system scheduler add") && B.indexOf("bridge port add") > B.indexOf("/system script run palm-sync"));
t("bridge mode hotspot sits on the bridge", B.includes('/ip hotspot add name=palm-hotspot interface="palm-bridge"'));
t("bridge mode lines are short", B.split("\n").every((l) => l.length < 460), String(Math.max(...B.split("\n").map((l) => l.length))));
t("single-port mode has no bridge", !s.includes("bridge port add") && !s.includes("interface bridge add"));
const items = [
  { s: 5, u: "room12", p: "Abcd1234", d: 3, down: 5000, up: 2000, mb: null, on: true },
  { s: 6, u: "late99", p: "Qwer1234", d: 1, down: null, up: null, mb: 500, on: false },
  { s: 7, u: 'bad";x', p: "Abcd1234", d: 1, down: null, up: null, mb: null, on: true },
];
const out = formatPull({ seq: 7, items });
eq("pull format", out, "S,7\nU,room12,Abcd1234,pc-d3-2000k-5000k,3,2000k/5000k,0,1\nU,late99,Qwer1234,pc-d1,1,-,524288000,0\n");
const many = Array.from({ length: 300 }, (_, i) => ({ s: i + 1, u: "user" + String(i).padStart(4, "0"), p: "Passw0rd" + i, d: 2, down: null, up: null, mb: null, on: true }));
const big = formatPull({ seq: 300, items: many });
t("pull respects 3500 byte cap", big.length <= 3500, String(big.length));
const lastLine = big.trim().split("\n").pop()!; const cur = Number(big.split("\n")[0].split(",")[1]);
t("cursor equals last included item (not final seq)", cur < 300 && lastLine.startsWith("U,user" + String(cur - 1).padStart(4, "0")), `cur=${cur} last=${lastLine}`);
eq("empty pull keeps cursor", formatPull({ seq: 9, items: [] }), "S,9\n");
eq("profile name clamps devices", profileName({ s: 1, u: "x", p: "y", d: 99, down: null, up: null, mb: null, on: true }), "pc-d10");
console.log(fails ? `FAILED ${fails}` : "ALL PASS"); Deno.exit(fails ? 1 : 0);
