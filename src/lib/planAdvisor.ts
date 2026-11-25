// Picks the cheapest plan that fits a business's answers. Plans (prices and limits) always come from the database.
export type AdvisorPlan = {
  code: string; name: string; monthly_price_cents: number; sort_order: number;
  min_rooms: number; max_rooms: number | null;
  max_branches: number | null; max_routers: number | null; max_staff_accounts: number | null;
};
export type Needs = { rooms: number | null; branches: number; routers: number; staff: number };

const fits = (limit: number | null, need: number) => limit === null || need <= limit;

export function fitsPlan(p: AdvisorPlan, n: Needs) {
  return fits(p.max_branches, n.branches) && fits(p.max_routers, n.routers) && fits(p.max_staff_accounts, n.staff)
    && (n.rooms === null || fits(p.max_rooms, n.rooms));
}

export function recommend(plans: AdvisorPlan[], n: Needs) {
  const sorted = [...plans].sort((a, b) => a.sort_order - b.sort_order);
  const plan = sorted.find((p) => fitsPlan(p, n)) ?? sorted[sorted.length - 1];
  const reasons: string[] = [];
  const why = (label: string, need: number, limit: number | null, unit: string) =>
    reasons.push(limit === null ? `${label}: no limit on ${unit}` : `${need} of ${limit} ${unit} used`);
  why("Sites", n.branches, plan.max_branches, "branches");
  why("Routers", n.routers, plan.max_routers, "routers");
  why("Staff", n.staff, plan.max_staff_accounts, "staff accounts");
  if (n.rooms !== null) reasons.push(plan.max_rooms === null ? `${n.rooms} rooms, no room limit` : `${n.rooms} of ${plan.max_rooms} rooms`);
  return { plan, reasons };
}
