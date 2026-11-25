/**
 * Central React Query key factory. Every module registers its keys here
 * so cache invalidation is grep-able.
 */
export const qk = {
  organizations: {
    all: ["organizations"] as const,
    detail: (id: string) => ["organizations", id] as const,
  },
  properties: { all: ["properties"] as const },
  routers: { all: ["routers"] as const, detail: (id: string) => ["routers", id] as const },
  packages: { all: ["packages"] as const },
  vouchers: { all: ["vouchers"] as const },
  payments: { all: ["payments"] as const },
  sessions: { active: ["sessions", "active"] as const },
  notifications: { mine: ["notifications", "mine"] as const },
  ai: {
    conversations: ["ai", "conversations"] as const,
    messages: (cid: string) => ["ai", "messages", cid] as const,
  },
  billing: {
    subscription: ["billing", "subscription"] as const,
    invoices: ["billing", "invoices"] as const,
    plans: ["billing", "plans"] as const,
  },
} as const;
