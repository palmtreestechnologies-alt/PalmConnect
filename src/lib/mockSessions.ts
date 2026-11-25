// Deterministic mock for active hotspot sessions until real RouterOS REST integration lands.
// Same pattern as RouterTelemetrySheet — seed by router id and tick over time.

export type Session = {
  id: string;
  router_id: string;
  router_name: string;
  user: string;
  mac: string;
  ip: string;
  uptime_s: number;
  bytes_in: number;
  bytes_out: number;
  rx_kbps: number;
  tx_kbps: number;
  package?: string;
};

function seed(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["alex", "kim", "ngugi", "amani", "zara", "deon", "iris", "tarek", "luna", "rio", "mara", "yuki"];
const PKGS = ["1hr Quick", "Daily Pass", "Week Saver", "Staff", "VIP"];

function randomMac(rng: () => number) {
  const hex = () => Math.floor(rng() * 256).toString(16).padStart(2, "0").toUpperCase();
  return [hex(), hex(), hex(), hex(), hex(), hex()].join(":");
}

export function generateSessions(routerId: string, routerName: string, tickMs = Date.now()): Session[] {
  const bucket = Math.floor(tickMs / 4000);
  const rng = seed(routerId + ":" + bucket);
  const count = 4 + Math.floor(rng() * 9);
  return Array.from({ length: count }).map((_, i) => {
    const r = seed(routerId + ":" + i);
    const uptime = Math.floor(r() * 14400);
    const inMB = r() * 800;
    const outMB = r() * 250;
    return {
      id: `${routerId}-${i}`,
      router_id: routerId,
      router_name: routerName,
      user: FIRST[Math.floor(r() * FIRST.length)] + Math.floor(r() * 900 + 100),
      mac: randomMac(r),
      ip: `10.5.${Math.floor(r() * 255)}.${Math.floor(r() * 254) + 1}`,
      uptime_s: uptime,
      bytes_in: Math.floor(inMB * 1024 * 1024),
      bytes_out: Math.floor(outMB * 1024 * 1024),
      rx_kbps: Math.floor(50 + rng() * 8000),
      tx_kbps: Math.floor(20 + rng() * 2000),
      package: PKGS[Math.floor(r() * PKGS.length)],
    };
  });
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function formatUptime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
