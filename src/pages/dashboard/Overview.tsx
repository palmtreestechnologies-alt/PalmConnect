import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Users, Wifi, Ticket, Router as RouterIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrialCountdownCard } from "@/components/TrialBanner";

function StatCard({ icon: Icon, label, value, hint, accent }: any) {
  return (
    <Card className="p-5 bg-card-grad shadow-card border-border hover:border-primary/30 transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-3xl font-bold text-foreground mt-2">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl grid place-items-center ${accent ?? "bg-emerald-grad"}`}><Icon className="h-5 w-5 text-background"/></div>
      </div>
    </Card>
  );
}


export default function Overview() {
  const { businessId } = useAuth();
  const [counts, setCounts] = useState({ vouchers: 0, routers: 0, onlineRouters: 0, packages: 0, users: 0 });

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const [v, r, p, u, ro] = await Promise.all([
        supabase.from("vouchers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("routers").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("packages").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("hotspot_users").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("routers").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "online"),
      ]);
      setCounts({ vouchers: v.count ?? 0, routers: r.count ?? 0, onlineRouters: ro.count ?? 0, packages: p.count ?? 0, users: u.count ?? 0 });
    })();
  }, [businessId]);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">A snapshot of your network.</p>
        </div>

        <TrialCountdownCard />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={RouterIcon} label="Routers" value={counts.routers}/>
          <StatCard icon={Wifi} label="Routers online" value={counts.onlineRouters}/>
          <StatCard icon={Ticket} label="Guest logins" value={counts.vouchers}/>
          <StatCard icon={Users} label="Packages" value={counts.packages}/>
        </div>

        <Card className="p-6 bg-card-grad">
          <h3 className="font-display font-semibold mb-1">Live usage</h3>
          <p className="text-sm text-muted-foreground">Active sessions, connected devices and bandwidth appear here once a router is connected and reporting. Nothing on this page is sample data.</p>
        </Card>

        <Card className="p-6 bg-card-grad">
          <h3 className="font-display font-semibold mb-4">Recent activity</h3>
          <p className="text-sm text-muted-foreground">Connect a router to see live sessions appear here.</p>
        </Card>
      </div>
    </DashboardLayout>
  );
}
