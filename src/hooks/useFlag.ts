/**
 * Simple feature-flag hook. Reads from a static map for now; will later
 * merge organizations.feature_flags jsonb from the current org.
 */
const defaults: Record<string, boolean> = {
  "palm-ai": true,
  "marketplace": false,
  "edge-gateway-downloads": true,
};

export function useFlag(name: string): boolean {
  return defaults[name] ?? false;
}
