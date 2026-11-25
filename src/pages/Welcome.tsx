import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { recommend, AdvisorPlan, Needs } from "@/lib/planAdvisor";
import { limitsText, fmtKsh } from "@/lib/plans";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Sparkles } from "lucide-react";

const TYPES = [
  { v: "bnb", l: "BNB" }, { v: "villa", l: "Villa" }, { v: "hotel", l: "Hotel" }, { v: "lodge", l: "Lodge" },
  { v: "restaurant", l: "Restaurant" }, { v: "cafe", l: "Café" }, { v: "lounge", l: "Lounge" },
  { v: "school", l: "School" }, { v: "hospital", l: "Hospital" },
];
const LODGING = ["bnb", "villa", "hotel", "lodge"];

type Choice = { label: string; value: number };
const ROOMS: Choice[] = [{ label: "1–10 rooms", value: 10 }, { label: "11–30 rooms", value: 30 }, { label: "More than 30", value: 31 }];
const SITES: Choice[] = [{ label: "Just one", value: 1 }, { label: "2–3 locations", value: 3 }, { label: "More than 3", value: 4 }];
const ROUTERS: Choice[] = [{ label: "1 router", value: 1 }, { label: "2–5 routers", value: 5 }, { label: "More than 5", value: 6 }];
const STAFF: Choice[] = [{ label: "Up to 10 people", value: 10 }, { label: "11–50 people", value: 50 }, { label: "More than 50", value: 51 }];

function Choices({ options, value, onPick }: { options: Choice[]; value: number | null; onPick: (v: number) => void }) {
  return (
    <div className="grid gap-2">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onPick(o.value)} aria-pressed={value === o.value}
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-muted ${value === o.value ? "border-primary bg-primary/5" : ""}`}>
          {o.label}{value === o.value && <Check className="h-4 w-4 text-primary" />}
        </button>
      ))}
    </div>
  );
}

export default function Welcome() {
  const { businessId, loading } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [plans, setPlans] = useState<AdvisorPlan[]>([]);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [about, setAbout] = useState({ name: "", type: "restaurant", phone: "" });
  const [a, setA] = useState<{ rooms: number | null; branches: number | null; routers: number | null; staff: number | null }>({ rooms: null, branches: null, routers: null, staff: null });
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const [{ data: b }, { data: p }] = await Promise.all([
        supabase.from("businesses").select("name, type, phone, onboarded_at").eq("id", businessId).maybeSingle(),
        supabase.from("subscription_plans").select("*").order("sort_order"),
      ]);
      if (b?.onboarded_at) { setDone(true); return; }
      setAbout({ name: b?.name && b.name !== "My Business" ? b.name : "", type: b?.type ?? "restaurant", phone: b?.phone ?? "" });
      setPlans((p ?? []) as AdvisorPlan[]);
      setReady(true);
    })();
  }, [businessId]);

  const lodging = LODGING.includes(about.type);
  // Steps: 0 about you, 1 rooms (lodging only), 2 sites, 3 routers, 4 staff, 5 result
  const flow = lodging ? [0, 1, 2, 3, 4, 5] : [0, 2, 3, 4, 5];
  const pos = flow.indexOf(step);
  const next = () => setStep(flow[pos + 1]);
  const back = () => setStep(flow[pos - 1]);

  const needs: Needs | null = a.branches && a.routers && a.staff && (!lodging || a.rooms)
    ? { rooms: lodging ? a.rooms : null, branches: a.branches, routers: a.routers, staff: a.staff } : null;
  const rec = useMemo(() => (needs && plans.length ? recommend(plans, needs) : null), [needs, plans]);
  const shown = plans.find((p) => p.code === chosen) ?? rec?.plan;

  async function finish(goCheckout: boolean) {
    if (!businessId || !shown) return;
    setSaving(true);
    const { error } = await supabase.from("businesses").update({
      name: about.name.trim(), type: about.type as never, phone: about.phone.trim() || null,
      onboarded_at: new Date().toISOString(),
      onboarding_answers: { ...a, recommended: rec?.plan.code, chosen: shown.code } as any,
    }).eq("id", businessId);
    setSaving(false);
    if (error) return toast.error("Could not save your details. Please try again.");
    navigate(goCheckout ? `/checkout?plan=${encodeURIComponent(shown.code)}` : "/dashboard", { replace: true });
  }

  if (done) return <Navigate to="/dashboard" replace />;
  if (loading || !ready) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const aboutOk = about.name.trim().length >= 2;
  const questions: Record<number, { title: string; hint: string; options: Choice[]; key: "rooms" | "branches" | "routers" | "staff" }> = {
    1: { title: "How many guest rooms do you have?", hint: "Count every room you rent out.", options: ROOMS, key: "rooms" },
    2: { title: "How many locations will use Palm Connect?", hint: "A location is one building or branch.", options: SITES, key: "branches" },
    3: { title: "How many MikroTik routers will you connect?", hint: "Bigger buildings often need one per floor or wing.", options: ROUTERS, key: "routers" },
    4: { title: "How many staff will log in to manage it?", hint: "Reception, managers and anyone who creates guest logins.", options: STAFF, key: "staff" },
  };
  const q = questions[step];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card"><div className="mx-auto flex max-w-xl items-center justify-between p-4"><Logo /><span className="text-xs text-muted-foreground">Step {Math.min(pos + 1, flow.length - 1)} of {flow.length - 1}</span></div></header>
      <main className="mx-auto max-w-xl p-4 py-8">
        <Card className="space-y-5 bg-card-grad p-6 shadow-card">
          {step === 0 && (
            <>
              <div><h1 className="font-display text-2xl font-bold">Tell us about your business</h1><p className="mt-1 text-sm text-muted-foreground">Your 10-day free trial is already running. A few quick questions and we'll suggest the right plan.</p></div>
              <div className="space-y-1.5"><Label htmlFor="w-name">Business name</Label><Input id="w-name" value={about.name} onChange={(e) => setAbout({ ...about, name: e.target.value })} maxLength={120} /></div>
              <div className="space-y-1.5"><Label>Business type</Label>
                <Select value={about.type} onValueChange={(v) => setAbout({ ...about, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label htmlFor="w-phone">Phone (optional)</Label><Input id="w-phone" value={about.phone} onChange={(e) => setAbout({ ...about, phone: e.target.value })} placeholder="+254..." maxLength={30} /></div>
              <Button variant="hero" className="w-full" disabled={!aboutOk} onClick={next}>Continue</Button>
            </>
          )}

          {q && (
            <>
              <div><h1 className="font-display text-2xl font-bold">{q.title}</h1><p className="mt-1 text-sm text-muted-foreground">{q.hint}</p></div>
              <Choices options={q.options} value={a[q.key]} onPick={(v) => { setA({ ...a, [q.key]: v }); setChosen(null); }} />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={back}><ArrowLeft className="h-4 w-4" /> Back</Button>
                <Button variant="hero" className="flex-1" disabled={!a[q.key]} onClick={next}>Continue</Button>
              </div>
            </>
          )}

          {step === 5 && rec && shown && (
            <>
              <div><h1 className="flex items-center gap-2 font-display text-2xl font-bold"><Sparkles className="h-5 w-5 text-secondary" /> We suggest {rec.plan.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">The lowest-priced plan that covers what you told us.</p></div>
              <div className="rounded-xl border-2 border-primary p-4">
                <div className="flex items-baseline justify-between"><span className="font-display text-lg font-semibold">{shown.name}</span>
                  <span><span className="font-display text-2xl font-bold">{fmtKsh(shown.monthly_price_cents)}</span><span className="text-sm text-muted-foreground"> / month</span></span></div>
                <p className="mt-1 text-sm text-muted-foreground">{limitsText(shown)}</p>
                {shown.code === rec.plan.code && <ul className="mt-3 space-y-1 text-sm">{rec.reasons.map((r) => <li key={r} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{r}</li>)}</ul>}
              </div>
              {plans.length > 1 && (
                <div>
                  <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Or compare</p>
                  <div className="flex flex-wrap gap-2">
                    {plans.map((p) => (
                      <button key={p.code} type="button" onClick={() => setChosen(p.code)} aria-pressed={shown.code === p.code}
                        className={`rounded-full border px-3 py-1.5 text-sm hover:bg-muted ${shown.code === p.code ? "border-primary bg-primary/5 font-semibold" : ""}`}>
                        {p.name} {p.code === rec.plan.code && <Badge variant="secondary" className="ml-1">Suggested</Badge>}
                      </button>
                    ))}
                  </div>
                  {shown.code !== rec.plan.code && (
                    <p className="mt-2 text-sm text-muted-foreground">{shown.sort_order < rec.plan.sort_order ? `${shown.name} may be too small for what you described.` : "This has more room than you need right now."}</p>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <Button variant="hero" className="w-full" disabled={saving} onClick={() => finish(true)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Continue with ${shown.name}`}</Button>
                <Button variant="ghost" className="w-full" disabled={saving} onClick={() => finish(false)}>Explore my free trial first</Button>
                <Button variant="ghost" size="sm" onClick={back}><ArrowLeft className="h-4 w-4" /> Change my answers</Button>
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
