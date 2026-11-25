// Pure helpers that build the RouterOS scripts and the sync response. No network, no Deno APIs,
// so they can be unit-tested anywhere. Everything that reaches a script is validated or hex-escaped.

export interface CidrPlan { network: string; mask: number; gateway: string; poolStart: string; poolEnd: string }

const ip2n = (s: string) => s.split(".").reduce((a, o) => ((a << 8) | Number(o)) >>> 0, 0) >>> 0;
const n2ip = (n: number) => [24, 16, 8, 0].map((sh) => (n >>> sh) & 255).join(".");

export function cidrPlan(cidr: string): CidrPlan {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(cidr);
  if (!m) throw new Error("invalid CIDR");
  const oct = m.slice(1, 5).map(Number);
  const bits = Number(m[5]);
  if (oct.some((o) => o > 255) || bits < 16 || bits > 28) throw new Error("CIDR must be /16 to /28");
  const priv = oct[0] === 10 || (oct[0] === 172 && oct[1] >= 16 && oct[1] <= 31) || (oct[0] === 192 && oct[1] === 168);
  if (!priv) throw new Error("CIDR must be a private range");
  const size = 2 ** (32 - bits);
  const net = (ip2n(oct.join(".")) & ((0xffffffff << (32 - bits)) >>> 0)) >>> 0;
  return { network: n2ip(net), mask: bits, gateway: n2ip(net + 1), poolStart: n2ip(net + 10), poolEnd: n2ip(net + size - 2) };
}

/** Make a string safe inside a RouterOS double-quoted string by hex-escaping the characters it interprets. */
export function rosEscape(s: string): string {
  return s.replace(/[\\"$\[\]?\n\r]/g, (c) => "\\" + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"));
}

/** Emit `source="..."` split over continuation lines so no single line is long. */
function quotedMultiline(src: string, chunk = 250): string {
  const parts: string[] = [];
  for (let i = 0; i < src.length; i += chunk) parts.push(rosEscape(src.slice(i, i + chunk)));
  return '"' + parts.join('\\\n') + '"';
}

const safeLabel = (s: string) => s.replace(/[^A-Za-z0-9 _-]/g, "").slice(0, 40);
const POLICY = "ftp,read,write,policy,test";

export interface SetupParams { baseUrl: string; routerId: string; agentKey: string; routerName: string; iface: string; cidr: string; ssid?: string | null }

export function buildSyncSource(p: { baseUrl: string; routerId: string; agentKey: string }): string {
  if (!/^https:\/\/[A-Za-z0-9.-]+(\/[A-Za-z0-9._\/-]*)?$/.test(p.baseUrl)) throw new Error("bad base url");
  if (!/^[0-9a-f-]{36}$/.test(p.routerId) || !/^[0-9a-f]{64}$/.test(p.agentKey)) throw new Error("bad id/key");
  return [
    ':global palmseq',
    ':if ([:typeof $palmseq]="nothing") do={:set palmseq 0}',
    ':local ver [/system resource get version]',
    ':local sp [:find $ver " "]',
    ':if ([:typeof $sp]="num") do={:set ver [:pick $ver 0 $sp]}',
    `:local url ("${p.baseUrl}/sync?id=${p.routerId}&c=" . $palmseq . "&cpu=" . [/system resource get cpu-load] . "&tm=" . [/system resource get total-memory] . "&fm=" . [/system resource get free-memory] . "&up=" . [/system resource get uptime] . "&ver=" . $ver . "&bd=" . [/system resource get board-name] . "&au=" . [:len [/ip hotspot active find]])`,
    ':local res ""',
    `:do {:set res [/tool fetch url=$url http-header-field="X-Agent-Key: ${p.agentKey}" check-certificate=no output=user as-value]} on-error={:log warning "Palm Connect: cannot reach server"; :return 0}`,
    ':local data ($res->"data")',
    ':local pos 0',
    ':local newseq ""',
    ':while ($pos < [:len $data]) do={',
    ' :local nl [:find $data "\\n" $pos]',
    ' :if ([:typeof $nl]="nil") do={:set nl [:len $data]}',
    ' :local line [:pick $data $pos $nl]',
    ' :set pos ($nl + 1)',
    ' :if ([:len $line] > 2) do={',
    '  :do {',
    '   :local f [:toarray $line]',
    '   :local t [:tostr ($f->0)]',
    '   :if ($t = "S") do={:set newseq [:tonum ($f->1)]}',
    '   :if ($t = "U") do={',
    '    :local u [:tostr ($f->1)]',
    '    :local pw [:tostr ($f->2)]',
    '    :local pr [:tostr ($f->3)]',
    '    :local sh [:tostr ($f->4)]',
    '    :local rt [:tostr ($f->5)]',
    '    :local lb [:tostr ($f->6)]',
    '    :local on [:tostr ($f->7)]',
    '    :if ($on = "1") do={',
    '     :if ([:len [/ip hotspot user profile find name=$pr]] = 0) do={',
    '      :if ($rt = "-") do={/ip hotspot user profile add name=$pr shared-users=$sh} else={/ip hotspot user profile add name=$pr shared-users=$sh rate-limit=$rt}',
    '     }',
    '     :local id [/ip hotspot user find name=$u]',
    '     :if ([:len $id] = 0) do={/ip hotspot user add name=$u password=$pw profile=$pr limit-bytes-total=$lb comment=palm} else={/ip hotspot user set $id password=$pw profile=$pr limit-bytes-total=$lb}',
    '    } else={',
    '     /ip hotspot active remove [/ip hotspot active find user=$u]',
    '     /ip hotspot user remove [/ip hotspot user find name=$u comment=palm]',
    '    }',
    '   }',
    '  } on-error={:log warning "Palm Connect: could not apply one line"}',
    ' }',
    '}',
    ':if ([:typeof $newseq]="num") do={:set palmseq $newseq}',
  ].join("\n");
}

/** Interface name meaning "every port except ether1, plus Wi-Fi": a bridge the script builds. */
export const BRIDGE_IFACE = "palm-bridge";

// Adds every matching interface to the guest bridge. Interfaces already in another bridge are left alone (and reported).
const addPorts = (menu: string, filter: string) =>
  `:do {:foreach i in=[/interface ${menu} find${filter}] do={:local n [/interface ${menu} get $i name]; :if ([:len [/interface bridge port find interface=$n bridge=${BRIDGE_IFACE}]]=0) do={:if ([:len [/interface bridge port find interface=$n]]>0) do={:put "Palm Connect: $n is already in another bridge and was left alone"} else={/interface bridge port add bridge=${BRIDGE_IFACE} interface=$n comment=palm-hotspot}}}} on-error={}`;

export function buildSetupScript(p: SetupParams): string {
  if (!/^[A-Za-z0-9._-]{1,15}$/.test(p.iface)) throw new Error("bad interface");
  const bridge = p.iface === BRIDGE_IFACE;
  const c = cidrPlan(p.cidr);
  const name = safeLabel(p.routerName) || "router";
  if (p.ssid != null && !/^[A-Za-z0-9 _-]{1,32}$/.test(p.ssid)) throw new Error("bad ssid");
  return [
    `# Palm Connect setup for ${name}`,
    ':log info "Palm Connect: setup started"',
    ...(bridge ? [] : [`:if ([:len [/interface find name="${p.iface}"]]=0) do={:put "Palm Connect: interface ${p.iface} was not found on this router. Check the name and paste the command again. Nothing was changed."; :error "interface not found"}`]),
    `:if ([:len [/ip hotspot find interface="${p.iface}" name!="palm-hotspot"]]>0) do={:put "Palm Connect: a different hotspot already runs on ${p.iface}. Nothing was changed."; :error "hotspot exists"}`,
    `:if ([:len [/ip address find where network=${c.network} comment!="palm-hotspot"]]>0) do={:put "Palm Connect: the range ${c.network}/${c.mask} is already used on this router (for example its factory LAN). Choose another range in your dashboard and paste the new command. Nothing was changed."; :error "range in use"}`,
    `:if ([:len [/ip dhcp-server network find where address="${c.network}/${c.mask}" comment!="palm-hotspot"]]>0) do={:put "Palm Connect: a DHCP network for ${c.network}/${c.mask} already exists on this router. Choose another range in your dashboard and paste the new command. Nothing was changed."; :error "dhcp network exists"}`,
    ':put "Palm Connect: saving a backup (palm-pre-setup) ..."',
    '/system backup save name=palm-pre-setup',
    '/export file=palm-pre-setup',
    ...(bridge ? [`:if ([:len [/interface bridge find name=${BRIDGE_IFACE}]]=0) do={/interface bridge add name=${BRIDGE_IFACE} comment=palm-hotspot}`] : []),
    // Make sure the guest login page files exist (a router reset without defaults has none).
    ':do {/ip hotspot reset-html} on-error={}',
    '/ip hotspot remove [find name=palm-hotspot]',
    '/ip hotspot profile remove [find name=palm-profile]',
    '/ip dhcp-server remove [find name=palm-dhcp]',
    '/ip dhcp-server network remove [find comment=palm-hotspot]',
    '/ip pool remove [find name=palm-pool]',
    '/ip address remove [find comment=palm-hotspot]',
    '/ip firewall nat remove [find comment=palm-hotspot]',
    `/ip pool add name=palm-pool ranges=${c.poolStart}-${c.poolEnd}`,
    `/ip address add address=${c.gateway}/${c.mask} interface="${p.iface}" comment=palm-hotspot`,
    `/ip dhcp-server network add address=${c.network}/${c.mask} gateway=${c.gateway} dns-server=${c.gateway} comment=palm-hotspot`,
    `/ip dhcp-server add name=palm-dhcp interface="${p.iface}" address-pool=palm-pool lease-time=1h disabled=no`,
    '/ip dns set allow-remote-requests=yes',
    `/ip hotspot profile add name=palm-profile hotspot-address=${c.gateway} login-by=http-chap,cookie`,
    `/ip hotspot add name=palm-hotspot interface="${p.iface}" address-pool=palm-pool profile=palm-profile disabled=no`,
    `/ip firewall nat add chain=srcnat action=masquerade src-address=${c.network}/${c.mask} comment=palm-hotspot`,
    '/system script remove [find name=palm-sync]',
    `/system script add name=palm-sync policy=${POLICY} source=${quotedMultiline(buildSyncSource(p))}`,
    '/system scheduler remove [find name=palm-sync]',
    `/system scheduler add name=palm-sync interval=1m start-time=startup on-event="/system script run palm-sync" policy=${POLICY}`,
    '/system script run palm-sync',
    // Ports join the bridge last: if the connection you pasted this over drops for a moment, setup is already done.
    ...(bridge && p.ssid ? [
      ':put "Palm Connect: turning on the Wi-Fi ..."',
      `:do {/interface wireless set [find default-name=wlan1] mode=ap-bridge ssid="${p.ssid}" country=kenya band=2ghz-b/g/n frequency=auto security-profile=default disabled=no} on-error={:put "Palm Connect: could not turn on the Wi-Fi. You can set it in WinBox under Wireless."}`,
    ] : []),
    ...(bridge ? [
      ':put "Palm Connect: adding ports to the guest network ..."',
      addPorts("ethernet", ' where name!="ether1"'),
      addPorts("wireless", ""),
      addPorts("wifi", ""),
      // Remove the temporary setup Wi-Fi network (palm-mgmt) if the owner created one to reach the router.
      ':do {/ip dhcp-server remove [find name=palm-mgmt-dhcp]; /ip dhcp-server network remove [find comment=palm-mgmt]; /ip pool remove [find name=palm-mgmt-pool]; /ip address remove [find comment=palm-mgmt]; /ip firewall nat remove [find comment=palm-mgmt]} on-error={}',
    ] : []),
    ':log info "Palm Connect: setup complete"',
    ':put "Palm Connect: setup complete. This router will appear as Online in your dashboard within a minute."',
    "",
  ].join("\n");
}

export interface PullItem { s: number; u: string; p: string; d: number; down: number | null; up: number | null; mb: number | null; on: boolean }

export function profileName(it: PullItem): string {
  const d = Math.min(Math.max(Math.trunc(it.d) || 1, 1), 10);
  return it.down || it.up ? `pc-d${d}-${it.up ?? 0}k-${it.down ?? 0}k` : `pc-d${d}`;
}

/** Build the text the router parses. Stays under maxBytes (RouterOS 6 reads ~4 KB); the cursor only covers lines included. */
export function formatPull(pull: { seq: number; items: PullItem[] }, maxBytes = 3500): string {
  const lines: string[] = [];
  let used = 16;
  let cursor: number | null = null;
  for (const it of pull.items) {
    if (!/^[A-Za-z0-9_.-]{3,32}$/.test(it.u) || !/^[A-Za-z0-9]{4,32}$/.test(it.p)) continue;
    const d = Math.min(Math.max(Math.trunc(it.d) || 1, 1), 10);
    const rate = it.down || it.up ? `${it.up ?? 0}k/${it.down ?? 0}k` : "-";
    const bytes = it.mb ? Math.trunc(it.mb) * 1048576 : 0;
    const line = `U,${it.u},${it.p},${profileName(it)},${d},${rate},${bytes},${it.on ? 1 : 0}`;
    if (used + line.length + 1 > maxBytes) break;
    lines.push(line); used += line.length + 1; cursor = it.s;
  }
  const finalSeq = lines.length === pull.items.filter((i) => /^[A-Za-z0-9_.-]{3,32}$/.test(i.u) && /^[A-Za-z0-9]{4,32}$/.test(i.p)).length ? pull.seq : (cursor ?? 0);
  return `S,${finalSeq}\n` + lines.join("\n") + (lines.length ? "\n" : "");
}

/** RouterOS uptime: "1w2d03:04:05" (v6) or "1w2d3h4m5s" (v7). Returns seconds. */
export function parseUptime(s: string): number | null {
  let m = /^(?:(\d+)w)?(?:(\d+)d)?(\d+):(\d+):(\d+)$/.exec(s);
  if (m) return +(m[1] ?? 0) * 604800 + +(m[2] ?? 0) * 86400 + +m[3] * 3600 + +m[4] * 60 + +m[5];
  m = /^(?:(\d+)w)?(?:(\d+)d)?(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(s);
  if (m && s.length) return +(m[1] ?? 0) * 604800 + +(m[2] ?? 0) * 86400 + +(m[3] ?? 0) * 3600 + +(m[4] ?? 0) * 60 + +(m[5] ?? 0);
  return null;
}
