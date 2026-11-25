import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, TrendingUp, Users, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function SuperAdmin() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: subs }, { data: biz }, { data: pcn }] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("sort_order"),
      supabase.from("subscriptions").select("*"),
      supabase.from("businesses").select("id, name, type, email, created_at"),
      supabase.from("plan_change_notifications").select("business_id, to_plan_id, effective_at").is("acknowledged_at", null),
    ]);
    setPlans(p ?? []);
    const planMap = new Map((p ?? []).map((x: any) => [x.id, x]));
    const subMap = new Map((subs ?? []).map((s: any) => [s.business_id, s]));
    const pcnMap = new Map((pcn ?? []).map((n: any) => [n.business_id, n]));
    setRows((biz ?? []).map((b: any) => {
      const s = subMap.get(b.id);
      const plan: any = s ? planMap.get(s.plan_id) : null;
      const upgrade: any = pcnMap.get(b.id);
      return { ...b, subscription: s, plan, upgradeTo: upgrade ? planMap.get(upgrade.to_plan_id) : null };
    }));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const mrr = rows.reduce((s, r) => s + (r.plan?.monthly_price_cents ?? 0), 0);
  const activeClients = rows.filter(r => r.subscription?.status === "active").length;
  const upgrades = rows.filter(r => r.upgradeTo).length;

  async function override(businessId: string, subId: string | undefined, planId: string) {
    if (!subId) return;
    const { error } = await supabase.from("subscriptions").update({ plan_id: planId, manual_override: true, pending_plan_id: null, grace_until: null }).eq("id", subId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Plan overridden" });
    load();
  }

  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-secondary"/>Super Admin</h1>
          <p className="text-sm text-muted-foreground">Platform-wide subscription & revenue overview.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-5 bg-card-grad"><p className="text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Users className="h-3 w-3"/>Active clients</p><p className="font-display text-3xl font-bold mt-1">{activeClients}</p></Card>
          <Card className="p-5 bg-card-grad"><p className="text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><TrendingUp className="h-3 w-3"/>MRR</p><p className="font-display text-3xl font-bold mt-1">KSh {(mrr/100).toLocaleString()}</p></Card>
          <Card className="p-5 bg-card-grad"><p className="text-xs text-muted-foreground uppercase tracking-widest flex items-center gap-1.5"><Sparkles className="h-3 w-3"/>Pending upgrades</p><p className="font-display text-3xl font-bold mt-1">{upgrades}</p></Card>
          <Card className="p-5 bg-card-grad"><p className="text-xs text-muted-foreground uppercase tracking-widest">Total businesses</p><p className="font-display text-3xl font-bold mt-1">{rows.length}</p></Card>
        </div>

        <Card className="bg-card-grad overflow-hidden">
          <div className="p-5 border-b border-border"><h2 className="font-display font-semibold">All businesses</h2></div>
          {loading ? <div className="p-12 text-center"><Loader2 className="h-6 w-6 mx-auto animate-spin text-primary"/></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Business</TableHead><TableHead>Type</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Upgrade</TableHead><TableHead>Override</TableHead></TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-semibold text-sm">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell className="capitalize text-xs">{r.type}</TableCell>
                    <TableCell><Badge variant="secondary">{r.plan?.name ?? "—"}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className={r.subscription?.status === "active" ? "bg-success/15 text-success" : "bg-muted"}>{r.subscription?.status ?? "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{r.upgradeTo ? <span className="text-warning">→ {r.upgradeTo.name}</span> : "—"}</TableCell>
                    <TableCell>
                      <Select value={r.plan?.id ?? ""} onValueChange={(v) => override(r.id, r.subscription?.id, v)}>
                        <SelectTrigger className="h-8 w-[170px] text-xs"><SelectValue placeholder="Change plan"/></SelectTrigger>
                        <SelectContent>{plans.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
