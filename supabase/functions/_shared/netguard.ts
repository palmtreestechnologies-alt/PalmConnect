// Blocks server-side requests to private, loopback, link-local and cloud-metadata addresses (SSRF).

const ALLOWED_PORTS = new Set([443, 8443, 8729, 4443]);

function ipv4Private(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) ||           // link-local + metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224                               // multicast / reserved
  );
}

function ipv6Private(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s === "::" || s === "::1") return true;
  if (s.startsWith("fc") || s.startsWith("fd") || s.startsWith("fe8") || s.startsWith("fe9") ||
      s.startsWith("fea") || s.startsWith("feb") || s.startsWith("ff")) return true;
  const m = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return ipv4Private(m[1]);
  return false;
}

export async function assertPublicHost(host: string, port: number): Promise<void> {
  if (!ALLOWED_PORTS.has(port)) throw new Error("Port not allowed");
  const h = host.trim().replace(/^\[|\]$/g, "");
  if (!h || h.length > 253 || /[\s/@?#\\]/.test(h)) throw new Error("Invalid host");
  if (/^[\d.]+$/.test(h)) {
    if (ipv4Private(h)) throw new Error("Host address not allowed");
    return;
  }
  if (h.includes(":")) {
    if (ipv6Private(h)) throw new Error("Host address not allowed");
    return;
  }
  const lower = h.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local") || lower.endsWith(".internal") || lower.endsWith(".localhost")) {
    throw new Error("Host not allowed");
  }
  // Resolve and make sure every answer is public (best effort against DNS-based bypass).
  let any = false;
  for (const type of ["A", "AAAA"] as const) {
    try {
      const answers = await Deno.resolveDns(lower, type);
      for (const ip of answers) {
        any = true;
        if (type === "A" ? ipv4Private(ip) : ipv6Private(ip)) throw new Error("Host resolves to a blocked address");
      }
    } catch (e) {
      if ((e as Error).message.includes("blocked")) throw e;
    }
  }
  if (!any) throw new Error("Host could not be resolved");
}
