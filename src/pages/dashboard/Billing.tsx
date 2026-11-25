import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Sparkles, Check, FileText, Loader2, Building2, BedDouble } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { limitsText } from "@/lib/plans";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

type Plan = { id: string; code: string; name: string; monthly_price_cents: number; max_branches: number | null; max_routers: number | null; max_staff_accounts: number | null; examples: string[]; is_popular: boolean; sort_order: number };

function fmt(cents: number) { return `KSh ${(cents / 100).toLocaleString()}`; }

export default function Billing() {
  const { businessId } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [stats, setStats] = useState({ rooms: 0, properties: 0 });
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);

  async function load() {
    if (!businessId) return;
    setLoading(true);
    const [{ data: p }, { data: s }, { data: inv }, { data: n }, { data: props }] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("sort_order"),
      supabase.from("subscriptions").select("*").eq("business_id", businessId).maybeSingle(),
      supabase.from("invoices").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(20),
      supabase.from("plan_change_notifications").select("*").eq("business_id", businessId).is("acknowledged_at", null).order("created_at", { ascending: false }),
      supabase.from("properties").select("room_count, active").eq("business_id", businessId),
    ]);
    setPlans(p ?? []);
    setSub(s);
    setInvoices(inv ?? []);
    setNotifs(n ?? []);
    const active = (props ?? []).filter((r: any) => r.active);
    setStats({ rooms: active.reduce((a: number, r: any) => a + (r.room_count || 0), 0), properties: active.length });
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [businessId]);

  const currentPlan = plans.find(p => p.id === sub?.plan_id);
  const pendingPlan = plans.find(p => p.id === sub?.pending_plan_id);
  const nextTier = currentPlan ? plans.find(p => p.sort_order === currentPlan.sort_order + 1) : null;

  async function ackNotif(id: string) {
    await supabase.from("plan_change_notifications").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  function payNow() { window.location.assign("/checkout"); }

  if (loading) return <DashboardLayout><div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-primary"/></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-sm text-muted-foreground">Your plan adjusts automatically based on your property size.</p>
        </div>

        {notifs.map((n) => (
          <Card key={n.id} className="p-5 bg-emerald-grad text-background flex items-start gap-4">
            <Sparkles className="h-6 w-6 text-secondary shrink-0 mt-0.5"/>
            <div className="flex-1">
              <h3 className="font-display font-semibold">{n.message}</h3>
              <p className="text-sm text-background/80 mt-1">Effective {new Date(n.effective_at).toLocaleDateString()} — a 30-day grace period applies.</p>
            </div>
            <Button variant="gold" size="sm" onClick={() => ackNotif(n.id)}>Got it</Button>
          </Card>
        ))}

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 bg-card-grad">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Current plan</p>
            <p className="font-display text-2xl font-bold mt-1">{currentPlan?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground mt-1">{currentPlan ? fmt(currentPlan.monthly_price_cents) + "/mo" : ""}</p>
            {sub?.manual_override && <Badge variant="secondary" className="mt-2">Admin override</Badge>}
          </Card>
          <Card className="p-5 bg-card-grad">
            <p className="text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><BedDouble className="h-3 w-3"/>Total rooms</p>
            <p className="font-display text-2xl font-bold mt-1">{stats.rooms}</p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5"><Building2 className="h-3 w-3"/>{stats.properties} {stats.properties === 1 ? "property" : "properties"}</p>
          </Card>
          <Card className="p-5 bg-card-grad">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Next qualifying</p>
            <p className="font-display text-2xl font-bold mt-1">{pendingPlan?.name ?? nextTier?.name ?? "You're on the top tier"}</p>
            {(pendingPlan || nextTier) && <p className="text-sm text-muted-foreground mt-1">{fmt((pendingPlan ?? nextTier!).monthly_price_cents)}/mo</p>}
            {sub?.grace_until && <p className="text-xs text-warning mt-2">Grace until {new Date(sub.grace_until).toLocaleDateString()}</p>}
          </Card>
        </div>

        <div>
          <h2 className="font-display text-xl font-bold mb-4">Plans</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((p) => {
              const current = p.id === sub?.plan_id;
              return (
                <Card key={p.id} className={`p-6 relative ${p.is_popular ? "bg-emerald-grad text-background shadow-elegant" : "bg-card-grad"} ${current ? "ring-2 ring-secondary" : ""}`}>
                  {p.is_popular && <span className="absolute -top-3 right-5 text-[10px] font-bold uppercase tracking-wider bg-gold-grad text-foreground px-3 py-1 rounded-full">Recommended</span>}
                  {current && <Badge className="absolute -top-3 left-5 bg-secondary text-secondary-foreground">Current plan</Badge>}
                  <h3 className={`font-display text-lg font-bold ${p.is_popular ? "text-background" : ""}`}>{p.name}</h3>
                  <p className={`text-xs mt-1 ${p.is_popular ? "text-background/70" : "text-muted-foreground"}`}>{limitsText(p)}</p>
                  <p className={`font-display text-3xl font-bold mt-3 ${p.is_popular ? "text-background" : ""}`}>{fmt(p.monthly_price_cents)}<span className={`text-sm font-normal ${p.is_popular ? "text-background/70" : "text-muted-foreground"}`}>/mo</span></p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full mt-3 ${p.is_popular ? "bg-background/15 text-background" : "bg-primary/10 text-primary"}`}><Check className="h-3 w-3"/>All Features Included</span>
                  <p className={`text-xs mt-3 leading-relaxed ${p.is_popular ? "text-background/80" : "text-muted-foreground"}`}>{p.examples.join(" · ")}</p>
                </Card>
              );
            })}
          </div>
        </div>

        <Card className="bg-card-grad overflow-hidden">
          <div className="p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-display font-semibold flex items-center gap-2"><FileText className="h-4 w-4"/>Invoices</h2>
              <p className="text-xs text-muted-foreground">M-Pesa payment integration ready.</p>
            </div>
            <Button onClick={payNow} disabled={!currentPlan}>
              {issuing ? <Loader2 className="h-4 w-4 animate-spin"/> : <CreditCard className="h-4 w-4"/>}
              Generate this month's invoice
            </Button>
          </div>
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground border-t border-border">No invoices yet.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Period</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead></TableRow></TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                    <TableCell className="text-xs">{new Date(i.period_start).toLocaleDateString()} → {new Date(i.period_end).toLocaleDateString()}</TableCell>
                    <TableCell className="font-semibold">{i.currency} {(i.amount_cents/100).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="secondary" className={i.status === "paid" ? "bg-success/15 text-success" : i.status === "failed" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}>{i.status}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(i.due_date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card className="p-5 bg-card-grad text-sm text-muted-foreground">
          Add or edit properties to recalculate your tier. <Link to="/dashboard/properties" className="text-primary font-medium hover:underline">Manage properties →</Link>
        </Card>
      </div>
    </DashboardLayout>
  );
}
