import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Wifi, Ticket, Router as RouterIcon, Check, ArrowRight, Brush, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrand } from "@/components/brand/BrandingProvider";
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
  const brand = useBrand();
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

        {!(counts.routers > 0 && counts.vouchers > 0 && (brand.logoUrl || brand.primary)) && (
          <Card className="p-6 bg-card-grad">
            <h3 className="font-display font-semibold">Get set up</h3>
            <p className="mb-4 text-sm text-muted-foreground">Three steps to your first guest on Wi-Fi.</p>
            <ol className="space-y-3">
              {[
                { done: counts.routers > 0, icon: RouterIcon, title: "Connect your MikroTik router", text: "Paste one command into the router and it connects itself.", to: "/dashboard/routers?connect=1", cta: "Connect router" },
                { done: !!(brand.logoUrl || brand.primary), icon: Brush, title: "Add your logo and colors", text: "Make the dashboard and guest login page yours.", to: "/dashboard/branding", cta: "Open branding" },
                { done: counts.vouchers > 0, icon: UserPlus, title: "Register your first guest", text: "Phone number, devices and stay. We create the login.", to: "/dashboard/vouchers", cta: "Register guest" },
              ].map((st) => (
                <li key={st.title} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${st.done ? "bg-success text-white" : "bg-muted text-muted-foreground"}`}>
                    {st.done ? <Check className="h-4 w-4" /> : <st.icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{st.title}</p>
                    <p className="text-xs text-muted-foreground">{st.text}</p>
                  </div>
                  {!st.done && <Button asChild size="sm" variant="outline"><Link to={st.to}>{st.cta} <ArrowRight className="h-3.5 w-3.5" /></Link></Button>}
                </li>
              ))}
            </ol>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={RouterIcon} label="Routers" value={counts.routers}/>
          <StatCard icon={Wifi} label="Routers online" value={counts.onlineRouters}/>
          <StatCard icon={Ticket} label="Guest logins" value={counts.vouchers}/>
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
