/**
 * Translation shim. All user-facing strings should flow through t(key, fallback)
 * so we can wire real i18n later without touching call sites.
 */
export function t(_key: string, fallback: string): string {
  return fallback;
}
