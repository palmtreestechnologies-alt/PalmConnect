import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { limitsText } from "@/lib/plans";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { Loader2, Check, Shield, Smartphone, CreditCard, Sparkles, Building2, BedDouble, Calendar, Gift, ArrowRight } from "lucide-react";
import { toast } from "sonner";

type Plan = { id: string; code: string; name: string; monthly_price_cents: number; max_branches: number | null; max_routers: number | null; max_staff_accounts: number | null; examples: string[]; is_popular: boolean; sort_order: number };

function fmtKsh(c: number) { return `KSh ${(c / 100).toLocaleString()}`; }
function fmtDate(d: Date) { return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" }); }

export default function Checkout() {
  const { businessId, user } = useAuth();
  const { sub, reload } = useSubscription();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [business, setBusiness] = useState<any>(null);
  const [stats, setStats] = useState({ rooms: 0, properties: 0 });
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "prompt" | "waiting" | "paid" | "failed">("idle");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const [{ data: p }, { data: b }, { data: pr }] = await Promise.all([
        supabase.from("subscription_plans").select("*").order("sort_order"),
        supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
        supabase.from("properties").select("room_count, active").eq("business_id", businessId),
      ]);
      setPlans((p ?? []) as any);
      setBusiness(b);
      const active = (pr ?? []).filter((r: any) => r.active);
      setStats({ rooms: active.reduce((a: number, r: any) => a + (r.room_count || 0), 0), properties: active.length });
      const urlPlan = params.get("plan");
      const initial = urlPlan || (p as any[] | null)?.find(x => x.is_popular)?.code || "starter";
      setSelectedCode(initial);
      if (user?.phone) setPhone(user.phone);
      setLoading(false);
    })();
  }, [businessId, params, user]);

  const selected = useMemo(() => plans.find(p => p.code === selectedCode) ?? plans[0], [plans, selectedCode]);

  const trialStart = useMemo(() => sub?.trial_started_at ? new Date(sub.trial_started_at) : new Date(), [sub]);
  const trialEnd = useMemo(() => {
    if (sub?.trial_ends_at) return new Date(sub.trial_ends_at);
    const d = new Date(trialStart); d.setDate(d.getDate() + 10); return d;
  }, [sub, trialStart]);
  const trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86_400_000));

  async function payNow() {
    if (!selected || !sub) return;
    if (!/^(?:\+?254|0)?(7|1)\d{8}$/.test(phone.replace(/\s/g, ""))) {
      toast.error("Enter a valid Kenyan M-Pesa number");
      return;
    }
    setSubmitting(true);
    setStatus("prompt");
    // Plan choice goes through a server function; it cannot change status or dates.
    const sel = await supabase.rpc("select_plan", { _plan_code: selected.code });
    if (sel.error) { setSubmitting(false); setStatus("idle"); toast.error("Could not select plan"); return; }
    const { data, error } = await supabase.functions.invoke("subscription-checkout", {
      body: { phone, plan_code: selected.code },
    });
    if (error || !data?.ok) {
      setSubmitting(false); setStatus("idle");
      toast.error(data?.message ?? "Could not start the M-Pesa prompt. Try again.");
      return;
    }
    toast.success(`Check your phone and enter your M-Pesa PIN to pay KSh ${data.amount.toLocaleString()}`);
    setStatus("waiting");
    const ref = data.checkout_request_id as string;
    const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/payment-status?ref=${encodeURIComponent(ref)}`;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(url).then((r) => r.json()).catch(() => null);
      if (res?.status === "paid") {
        setStatus("paid"); await reload(); toast.success("Payment received. Your subscription is active.");
        navigate("/dashboard"); return;
      }
      if (res?.status === "failed" || res?.status === "cancelled") {
        setSubmitting(false); setStatus("failed");
        toast.error(res.status === "cancelled" ? "Payment cancelled" : "Payment failed. You have not been charged.");
        return;
      }
    }
    setSubmitting(false); setStatus("idle");
    toast.message("Still waiting for M-Pesa", { description: "If you paid, your subscription activates within a minute. Refresh this page to check." });
  }

  if (loading || !selected) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo />
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">Skip for now →</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="flex items-center gap-3 mb-2">
          <Badge className="bg-gold-grad text-foreground font-bold uppercase tracking-wider"><Gift className="h-3 w-3 mr-1" />10-day FREE trial</Badge>
          <Badge variant="outline" className="border-secondary/50 text-secondary">All Features Included</Badge>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">Choose a plan and pay</h1>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
          Your 10-day free trial is already running. Pick the plan that fits your property and pay with M-Pesa when you are ready. Payment goes to Palm Trees Technologies.
        </p>

        <div className="grid lg:grid-cols-[1fr,420px] gap-6 mt-8">
          {/* LEFT — plan + payment */}
          <div className="space-y-6">
            <Card className="p-6 bg-card-grad">
              <h2 className="font-display font-semibold text-lg flex items-center gap-2"><Sparkles className="h-4 w-4 text-secondary" />Choose your plan</h2>
              <p className="text-xs text-muted-foreground mt-1">Pricing scales with your property size. Switch any time.</p>
              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                {plans.map((p) => {
                  const active = p.code === selectedCode;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedCode(p.code)}
                      className={`text-left rounded-lg border p-4 transition relative ${active ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:border-primary/40"}`}
                    >
                      {p.is_popular && <span className="absolute -top-2 right-3 text-[10px] font-bold uppercase tracking-wider bg-gold-grad text-foreground px-2 py-0.5 rounded-full">Popular</span>}
                      <p className="font-display font-bold">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{limitsText(p)}</p>
                      <p className="font-display text-xl font-bold mt-2">{fmtKsh(p.monthly_price_cents)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                      {active && <Check className="absolute top-3 right-3 h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 bg-card-grad">
              <h2 className="font-display font-semibold text-lg flex items-center gap-2"><Smartphone className="h-4 w-4 text-secondary" />Pay with M-Pesa</h2>
              <p className="text-xs text-muted-foreground mt-1">You will get a prompt on your phone. Enter your M-Pesa PIN to confirm. Payments go to Palm Trees Technologies.</p>
              <div className="mt-4 space-y-1.5 max-w-sm">
                <Label htmlFor="mpesa-phone" className="text-xs">M-Pesa number</Label>
                <Input id="mpesa-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07XX XXX XXX" inputMode="tel" disabled={submitting} />
              </div>
              <div className="flex items-start gap-2 mt-5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-secondary" />
                <p>We never see your M-Pesa PIN. Your plan is billed every 30 days; you pay each time, nothing is charged automatically.</p>
              </div>
            </Card>
          </div>

          {/* RIGHT — summary */}
          <div className="lg:sticky lg:top-20 self-start">
            <Card className="p-6 bg-emerald-grad text-background shadow-elegant">
              <p className="text-xs uppercase tracking-widest text-background/70">Order summary</p>
              <h3 className="font-display text-2xl font-bold mt-1">{selected.name}</h3>
              <p className="text-sm text-background/80 mt-0.5">{selected.examples?.slice(0, 2).join(" · ")}</p>

              <div className="mt-5 space-y-3 text-sm">
                <Row icon={<Building2 className="h-3.5 w-3.5" />} label="Business" value={business?.name ?? "—"} />
                <Row icon={<BedDouble className="h-3.5 w-3.5" />} label="Rooms" value={String(stats.rooms)} />
                <Row icon={<Building2 className="h-3.5 w-3.5" />} label="Properties" value={String(stats.properties)} />
                <Row icon={<Calendar className="h-3.5 w-3.5" />} label="Trial duration" value="10 days" />
                <Row icon={<Calendar className="h-3.5 w-3.5" />} label="Trial starts" value={fmtDate(trialStart)} />
                <Row icon={<Calendar className="h-3.5 w-3.5" />} label="Trial ends" value={fmtDate(trialEnd)} />
              </div>

              <div className="border-t border-background/20 mt-5 pt-4 space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-background/70">Pay now</p>
                    <p className="font-display text-3xl font-bold">{fmtKsh(selected.monthly_price_cents)}</p>
                  </div>
                  <p className="text-right text-xs text-background/70">for 30 days<br />of {selected.name}</p>
                </div>
              </div>

              <div className="mt-4 rounded-md bg-background/15 px-3 py-2 text-xs flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
                {trialDaysLeft > 0 ? `${trialDaysLeft} days of free trial left. You can keep trying before you pay.` : "Your free trial has ended. Pay to continue using Palm Connect."}
              </div>

              <Button onClick={payNow} disabled={submitting} variant="gold" className="w-full mt-5 h-12 text-base">
                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> {status === "waiting" ? "Waiting for M-Pesa…" : "Starting…"}</>) : (<>Pay {fmtKsh(selected.monthly_price_cents)} with M-Pesa <ArrowRight className="h-4 w-4" /></>)}
              </Button>
              <Link to="/dashboard" className="block text-[11px] text-background/70 text-center mt-3 hover:underline">Continue my free trial instead</Link>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-background/70">{icon}{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
