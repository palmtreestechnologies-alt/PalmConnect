import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fmtKsh, limitsText } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui/card";
import { Wifi, ShieldCheck, QrCode, Smartphone, Activity, Building2, Coffee, Hotel, Home, Palmtree, Check, ArrowRight, Lock, Zap, Globe2, Tent, UtensilsCrossed, Martini, GraduationCap, Stethoscope, Download, Router as RouterIcon } from "lucide-react";
import hero from "@/assets/hero.jpg";

const features = [
  { icon: Lock, title: "Anti-Sharing Lock", desc: "Bind every login to one device via MAC address. Block password sharing instantly." },
  { icon: QrCode, title: "QR Code Access", desc: "Generate per-table or per-room QR codes. Guests scan and connect in seconds." },
  { icon: Ticket, title: "Smart Vouchers", desc: "Bulk-print thousands of unique vouchers with one click. PDF-ready." },
  { icon: Activity, title: "Live Sessions", desc: "Watch every connected device, bandwidth used, and time remaining in real time." },
  { icon: Zap, title: "MikroTik Native", desc: "Direct RouterOS v7 REST API integration. Sync users, profiles, and sessions." },
  { icon: ShieldCheck, title: "Role-Based Access", desc: "Owner, staff, and admin roles. Staff prints vouchers; you keep control." },
];

const businesses = [
  { icon: Home, name: "BNB" },
  { icon: Palmtree, name: "Villas" },
  { icon: Hotel, name: "Hotels" },
  { icon: Tent, name: "Lodges" },
  { icon: UtensilsCrossed, name: "Restaurants" },
  { icon: Coffee, name: "Cafés" },
  { icon: Martini, name: "Lounges" },
  { icon: GraduationCap, name: "Schools" },
  { icon: Stethoscope, name: "Hospitals" },
];

type PlanRow = { id: string; code: string; name: string; monthly_price_cents: number; is_popular: boolean; examples: string[]; max_branches: number | null; max_routers: number | null; max_staff_accounts: number | null };

import { Ticket } from "lucide-react";
import HowItWorks from "@/components/landing/HowItWorks";
import SupportedDevices from "@/components/landing/SupportedDevices";

export default function Landing() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  useEffect(() => {
    supabase.from("subscription_plans").select("id, code, name, monthly_price_cents, is_popular, examples, max_branches, max_routers, max_staff_accounts").order("sort_order")
      .then(({ data }) => setPlans((data as PlanRow[] | null) ?? []));
  }, []);
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition">How it works</a>
            <a href="#supported-devices" className="hover:text-foreground transition">Supported devices</a>
            <a href="#who" className="hover:text-foreground transition">Who it's for</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex"><Link to="/login">Sign in</Link></Button>
            <Button asChild variant="hero"><Link to="/register">Get started</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-hero opacity-95" />
        <div className="absolute inset-0 opacity-20 mix-blend-screen">
          <img src={hero} alt="" width={1536} height={1024} className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-xs font-semibold uppercase tracking-wider mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" /> Guest WiFi Platform
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-background leading-[1.05] text-balance">
              Works With The Wi-Fi<br/>
              <span className="bg-gold-grad bg-clip-text text-transparent">You Already Have.</span>
            </h1>
            <p className="mt-6 text-lg text-background/75 max-w-xl leading-relaxed">
              Palm Connect is the centralized hospitality Wi-Fi management layer for MikroTik, UniFi, TP-Link Omada, Grandstream, Ruijie and generic APs. Mix any brands, keep one SSID, and let guests roam from lounge to pool to room without logging in again.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="hero"><Link to="/register">Start free trial <ArrowRight className="ml-1 h-4 w-4"/></Link></Button>
              <Button asChild size="lg" variant="outline-light"><a href="#features">See how it works</a></Button>
            </div>
            <a
              href="/mikrotik-setup-card.pdf"
              download
              className="mt-6 inline-flex items-center gap-3 rounded-xl border border-background/20 bg-background/5 hover:bg-background/10 transition-colors px-4 py-3 text-background/90 backdrop-blur-sm group"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/20 text-secondary">
                <RouterIcon className="h-4 w-4" />
              </span>
              <span className="flex-1 text-left">
                <span className="block text-sm font-semibold">MikroTik Setup Card</span>
                <span className="block text-xs text-background/60">1-page PDF · enable REST &amp; create API user</span>
              </span>
              <Download className="h-4 w-4 text-background/70 group-hover:text-background transition-colors" />
            </a>
            <div className="mt-10 flex flex-wrap gap-6 text-background/60 text-sm">
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-secondary"/>No credit card</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-secondary"/>RouterOS v7 ready</div>
              <div className="flex items-center gap-2"><Check className="h-4 w-4 text-secondary"/>M-Pesa coming soon</div>
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="absolute -inset-8 bg-gold-grad opacity-20 blur-3xl rounded-full" />
            <Card className="relative bg-card-grad border-secondary/20 p-6 shadow-elegant">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><Wifi className="h-4 w-4 text-primary"/><span className="font-semibold text-sm">Live Sessions</span></div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success font-semibold">42 online</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { u: "PT4821", d: "iPhone 14", t: "1h 32m left", b: "120 MB" },
                  { u: "VL9173", d: "Samsung A54", t: "45m left", b: "78 MB" },
                  { u: "RT2048", d: "MacBook Pro", t: "23m left", b: "412 MB" },
                  { u: "HT5566", d: "Pixel 8", t: "2h 11m left", b: "56 MB" },
                ].map((s) => (
                  <div key={s.u} className="flex items-center justify-between p-3 rounded-lg bg-muted/60 hover:bg-muted transition">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-emerald-grad grid place-items-center"><Smartphone className="h-4 w-4 text-background"/></div>
                      <div>
                        <p className="text-sm font-mono font-semibold text-foreground">{s.u}</p>
                        <p className="text-[11px] text-muted-foreground">{s.d}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">{s.t}</p>
                      <p className="text-[11px] text-muted-foreground">{s.b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl">
            <p className="text-secondary text-sm font-semibold uppercase tracking-widest mb-3">Built to stop sharing</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground text-balance">Every feature you need to monetize and control your WiFi.</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
            {features.map((f) => (
              <Card key={f.title} className="p-6 bg-card-grad border-border hover:border-primary/30 hover:shadow-card transition-all group">
                <div className="h-11 w-11 rounded-xl bg-emerald-grad grid place-items-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5 text-background"/>
                </div>
                <h3 className="font-display font-semibold text-lg text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who */}
      <section id="who" className="py-20 px-4 sm:px-6 bg-muted/40">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">Made for any business that gives WiFi to guests.</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-12">
            {businesses.map((b) => (
              <div key={b.name} className="p-6 rounded-2xl bg-card border border-border hover:border-secondary/40 transition group">
                <b.icon className="h-8 w-8 text-primary mx-auto mb-3 group-hover:text-secondary transition"/>
                <p className="text-sm font-medium text-foreground">{b.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <HowItWorks />

      {/* Supported devices */}
      <SupportedDevices />

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-secondary text-sm font-semibold uppercase tracking-widest mb-3">Hospitality Pricing</p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">All features. Every plan.</h2>
            <p className="text-muted-foreground mt-3">Pricing scales with your property size — never with features.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mt-12 max-w-5xl mx-auto">
            {plans.map((pl) => { const p = { ...pl, featured: pl.is_popular, price: fmtKsh(pl.monthly_price_cents), period: "/mo", rooms: limitsText(pl), examplesText: pl.examples.join(", "), cta: `Choose ${pl.name}` }; return (
              <Card key={p.name} className={`p-7 relative ${p.featured ? "bg-emerald-grad border-secondary text-background shadow-elegant scale-[1.03]" : "bg-card border-border"}`}>
                {p.featured && <span className="absolute -top-3 right-5 text-[10px] font-bold uppercase tracking-wider bg-gold-grad text-foreground px-3 py-1 rounded-full">Recommended</span>}
                <h3 className={`font-display text-xl font-bold ${p.featured ? "text-background" : "text-foreground"}`}>{p.name}</h3>
                <p className={`text-xs mt-1 ${p.featured ? "text-background/70" : "text-muted-foreground"}`}>{p.rooms}</p>
                <div className="mt-3 mb-4">
                  <span className={`font-display text-4xl font-bold ${p.featured ? "text-background" : "text-foreground"}`}>{p.price}</span>
                  <span className={p.featured ? "text-background/70" : "text-muted-foreground"}>{p.period}</span>
                </div>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full mb-4 ${p.featured ? "bg-background/15 text-background" : "bg-primary/10 text-primary"}`}>
                  <Check className="h-3 w-3"/> All Features Included
                </span>
                <p className={`text-sm leading-relaxed mb-6 ${p.featured ? "text-background/85" : "text-foreground/75"}`}>{p.examplesText}</p>
                <Button asChild className="w-full" variant={p.featured ? "gold" : "default"}><Link to={`/register?plan=${p.code}`}>{p.cta}</Link></Button>
              </Card>
            ); })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto rounded-3xl bg-hero p-10 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 h-64 w-64 bg-secondary/20 blur-3xl rounded-full"/>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-background relative">Take back control of your hotspot today.</h2>
          <p className="text-background/75 mt-4 max-w-xl mx-auto relative">Set up in under 10 minutes. Connect your MikroTik. Issue your first guest logins. Done.</p>
          <Button asChild size="lg" variant="gold" className="mt-8 relative"><Link to="/register">Create your free account <ArrowRight className="ml-1 h-4 w-4"/></Link></Button>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Palm Connect. Built for African hospitality.</p>
        </div>
      </footer>
    </div>
  );
}
