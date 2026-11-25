// Plan display helpers. Prices and limits always come from the subscription_plans table, never hardcoded.
export type PlanLimits = {
  max_branches: number | null;
  max_routers: number | null;
  max_staff_accounts: number | null;
};

const n = (v: number | null, one: string, many: string) => (v === null ? `Unlimited ${many}` : `${v} ${v === 1 ? one : many}`);

export function limitsText(p: PlanLimits): string {
  return [n(p.max_branches, "branch", "branches"), n(p.max_routers, "router", "routers"), n(p.max_staff_accounts, "staff account", "staff accounts")].join(" · ");
}

export const fmtKsh = (cents: number) => `KSh ${(cents / 100).toLocaleString()}`;
