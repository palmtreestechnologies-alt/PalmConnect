import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import LinkRouterDemoModal from "./LinkRouterDemoModal";
import {
  Terminal,
  Globe2,
  LayoutDashboard,
  KeyRound,
  PlugZap,
  Cpu,
  ListChecks,
  CheckCircle2,
  Activity,
  ArrowRight,
  PlayCircle,
  Check,
  Wifi,
  Server,
  ShieldCheck,
} from "lucide-react";

/* ─────────────────────────────  Step mock visuals  ───────────────────────────── */

const TerminalMock = () => (
  <div className="rounded-xl bg-[hsl(210_60%_6%)] border border-secondary/20 overflow-hidden shadow-elegant">
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-background/10 bg-background/5">
      <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
      <span className="h-2.5 w-2.5 rounded-full bg-secondary/80" />
      <span className="ml-3 text-[11px] font-mono text-background/50">winbox › terminal</span>
    </div>
    <pre className="p-4 text-[11.5px] leading-relaxed font-mono text-secondary/90 whitespace-pre-wrap">
{`[admin@MikroTik] > /ip service enable www-ssl
[admin@MikroTik] > /ip service set www-ssl port=443
[admin@MikroTik] > /user add name=palmapi \\
                     password=StrongPass123! group=full
[admin@MikroTik] > /ip firewall filter add chain=input \\
                     protocol=tcp dst-port=443 action=accept \\
                     place-before=0`}
    </pre>
  </div>
);

const DdnsMock = () => (
  <div className="rounded-xl bg-background/[0.04] border border-background/10 p-4 backdrop-blur-sm">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-background/80 text-xs font-semibold">
        <Globe2 className="h-3.5 w-3.5 text-secondary" /> MikroTik · IP › Cloud
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/15 px-2 py-0.5 rounded-full">Enabled</span>
    </div>
    <div className="space-y-2 text-[12px]">
      {[
        ["DDNS Enabled", "yes"],
        ["Public Address", "102.213.55.18"],
        ["DNS Name", "hotel-diani.sn.mynetname.net"],
        ["API Port", "443"],
        ["Username", "palmapi"],
      ].map(([k, v]) => (
        <div key={k} className="flex items-center justify-between border-b border-background/5 pb-1.5 last:border-0">
          <span className="text-background/55">{k}</span>
          <span className="font-mono text-background/95">{v}</span>
        </div>
      ))}
    </div>
  </div>
);

const DashboardMock = () => (
  <div className="rounded-xl bg-background/[0.04] border border-background/10 overflow-hidden">
    <div className="flex">
      <div className="w-1/3 bg-[hsl(210_60%_9%)] p-3 space-y-1.5 border-r border-background/10">
        {["Overview", "Routers", "Hotspot", "Vouchers", "Billing"].map((i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-[11px] rounded-md px-2 py-1.5 ${
              i === "Routers" ? "bg-secondary/20 text-secondary font-semibold" : "text-background/60"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" /> {i}
          </div>
        ))}
      </div>
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-background/90 text-sm font-semibold">Routers</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-gold-grad text-foreground px-2 py-1 rounded-md">
            + Link MikroTik
          </span>
        </div>
        <div className="space-y-2">
          {["Diani Reef · Online", "Watamu Villa · Online"].map((r) => (
            <div key={r} className="flex items-center justify-between bg-background/5 rounded-md px-2.5 py-2 text-[11px] text-background/70">
              <span className="flex items-center gap-2"><Wifi className="h-3 w-3 text-secondary" /> {r}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const WizardMock = () => (
  <div className="rounded-xl bg-background/[0.04] border border-background/10 p-4">
    <div className="flex items-center justify-between mb-3">
      <p className="text-background/90 text-xs font-semibold">Provision a MikroTik</p>
      <span className="text-[10px] text-background/50">Step 1 of 3 · Connection</span>
    </div>
    <div className="space-y-2">
      {[
        ["Friendly Name", "Diani Reef"],
        ["DDNS Hostname", "hotel-diani.sn.mynetname.net"],
        ["API Port", "443"],
        ["Username", "palmapi"],
        ["Password", "••••••••••"],
      ].map(([l, v]) => (
        <div key={l} className="bg-background/5 rounded-md px-2.5 py-1.5">
          <p className="text-[9px] uppercase tracking-wider text-background/40">{l}</p>
          <p className="text-[11.5px] font-mono text-background/90">{v}</p>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <span className="h-3.5 w-3.5 rounded bg-secondary grid place-items-center"><Check className="h-2.5 w-2.5 text-foreground" /></span>
        <span className="text-[11px] text-background/75">Trust self-signed certificate</span>
      </div>
      <button className="w-full mt-2 bg-gold-grad text-foreground text-[11px] font-bold py-2 rounded-md">
        Test Connection
      </button>
    </div>
  </div>
);

const SuccessMock = () => (
  <div className="rounded-xl bg-background/[0.04] border border-secondary/30 p-5 text-center">
    <div className="h-12 w-12 rounded-full bg-secondary/20 grid place-items-center mx-auto mb-3">
      <CheckCircle2 className="h-6 w-6 text-secondary" />
    </div>
    <p className="text-secondary text-sm font-bold mb-3">Connection Successful</p>
    <div className="text-[11px] text-background/70 space-y-1 text-left bg-background/5 rounded-md p-3 font-mono">
      <p>identity: <span className="text-background/95">Diani-Reef-MT</span></p>
      <p>routeros: <span className="text-background/95">7.14.3</span></p>
      <p>model: <span className="text-background/95">hAP ax³</span></p>
      <p>uptime: <span className="text-background/95">12d 4h 22m</span></p>
    </div>
  </div>
);

const DeviceMock = () => (
  <div className="rounded-xl bg-background/[0.04] border border-background/10 p-4">
    <div className="flex items-center gap-2 mb-3">
      <Cpu className="h-3.5 w-3.5 text-secondary" />
      <p className="text-background/90 text-xs font-semibold">Router Details</p>
    </div>
    <div className="grid grid-cols-2 gap-2 text-[11px]">
      {[
        ["Identity", "Diani-Reef-MT"],
        ["RouterOS", "7.14.3"],
        ["CPU", "12%"],
        ["Memory", "34%"],
        ["Serial", "HEX-77F2"],
        ["Arch", "arm64"],
      ].map(([k, v]) => (
        <div key={k} className="bg-background/5 rounded-md px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wider text-background/40">{k}</p>
          <p className="text-background/90 font-mono">{v}</p>
        </div>
      ))}
    </div>
  </div>
);

const ServicesMock = () => (
  <div className="rounded-xl bg-background/[0.04] border border-background/10 p-4 space-y-2">
    {[
      ["Hotspot Access", true],
      ["Bandwidth Management", true],
      ["Monitoring", true],
      ["VPN Management", false],
    ].map(([label, on]) => (
      <label key={label as string} className="flex items-center gap-2.5 text-[12px] text-background/85 bg-background/5 rounded-md px-3 py-2">
        <span className={`h-4 w-4 rounded grid place-items-center border ${on ? "bg-secondary border-secondary" : "border-background/20"}`}>
          {on ? <Check className="h-3 w-3 text-foreground" /> : null}
        </span>
        {label}
      </label>
    ))}
  </div>
);

const LinkedMock = () => (
  <div className="rounded-xl bg-emerald-grad p-6 text-center">
    <div className="h-14 w-14 rounded-full bg-background/15 grid place-items-center mx-auto mb-3">
      <CheckCircle2 className="h-8 w-8 text-background" />
    </div>
    <p className="text-background text-base font-bold">Router Linked Successfully</p>
    <p className="text-background/75 text-xs mt-1">Diani Reef · hAP ax³</p>
    <button className="mt-4 bg-background/15 hover:bg-background/25 transition text-background text-xs font-semibold px-4 py-2 rounded-md">
      Go to Routers →
    </button>
  </div>
);

const MonitorMock = () => (
  <div className="rounded-xl bg-background/[0.04] border border-background/10 p-4 space-y-3">
    <div className="grid grid-cols-3 gap-2">
      {[
        ["Online", "42", "secondary"],
        ["Throughput", "18 Mb/s", "background"],
        ["Uptime", "99.9%", "background"],
      ].map(([l, v, c]) => (
        <div key={l} className="bg-background/5 rounded-md p-2 text-center">
          <p className={`text-sm font-bold ${c === "secondary" ? "text-secondary" : "text-background/95"}`}>{v}</p>
          <p className="text-[9px] uppercase tracking-wider text-background/50">{l}</p>
        </div>
      ))}
    </div>
    <div className="h-16 rounded-md bg-background/5 relative overflow-hidden">
      <svg viewBox="0 0 200 60" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="hw-spark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(152 70% 50%)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="hsl(152 70% 50%)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M0,45 L20,38 L40,42 L60,28 L80,32 L100,18 L120,24 L140,12 L160,20 L180,8 L200,14 L200,60 L0,60 Z" fill="url(#hw-spark)" />
        <path d="M0,45 L20,38 L40,42 L60,28 L80,32 L100,18 L120,24 L140,12 L160,20 L180,8 L200,14" stroke="hsl(152 70% 55%)" strokeWidth="1.5" fill="none" />
      </svg>
    </div>
  </div>
);

/* ─────────────────────────────  Steps  ───────────────────────────── */

export const steps = [
  {
    n: "01",
    icon: Terminal,
    title: "Enable MikroTik API Access",
    desc: "Run 4 quick commands to securely allow Palm Connect to talk to your router.",
    badge: "Setup takes under 2 minutes",
    mock: <TerminalMock />,
  },
  {
    n: "02",
    icon: Globe2,
    title: "Copy Router Details",
    desc: "Grab your MikroTik DDNS hostname, API user and password — no static IP required.",
    badge: "No static IP required",
    mock: <DdnsMock />,
  },
  {
    n: "03",
    icon: LayoutDashboard,
    title: "Go to Router Linking Wizard",
    desc: "Navigate to Dashboard → Routers → Link MikroTik.",
    mock: <DashboardMock />,
  },
  {
    n: "04",
    icon: KeyRound,
    title: "Paste Router Credentials",
    desc: "Paste hostname & credentials. Works with MikroTik’s default self-signed certificate.",
    badge: "Self-signed cert supported",
    mock: <WizardMock />,
  },
  {
    n: "05",
    icon: PlugZap,
    title: "Verify Connection Instantly",
    desc: "Palm Connect securely tests the router and confirms connectivity in seconds.",
    mock: <SuccessMock />,
  },
  {
    n: "06",
    icon: Cpu,
    title: "Router Details Auto-Detected",
    desc: "Identity, RouterOS version, model, CPU, memory and serial — all read automatically.",
    mock: <DeviceMock />,
  },
  {
    n: "07",
    icon: ListChecks,
    title: "Choose Services",
    desc: "Enable hotspot, bandwidth management, monitoring and more with a single click.",
    mock: <ServicesMock />,
  },
  {
    n: "08",
    icon: CheckCircle2,
    title: "Connected Successfully",
    desc: "Your router is online and managed in Palm Connect.",
    mock: <LinkedMock />,
  },
  {
    n: "09",
    icon: Activity,
    title: "Monitor From Anywhere",
    desc: "Router health, bandwidth graphs, active users and uptime — from any device.",
    mock: <MonitorMock />,
  },
];

export default function HowItWorks() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <section id="how-it-works" className="relative py-24 px-4 sm:px-6 bg-hero overflow-hidden">
      <LinkRouterDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
      {/* ambient glows */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-72 w-[40rem] bg-secondary/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-64 w-64 bg-secondary/10 blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/15 border border-secondary/30 text-secondary text-xs font-semibold uppercase tracking-wider mb-5">
            <Server className="h-3 w-3" /> How it works
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-background text-balance leading-tight">
            Link Your MikroTik Router <span className="bg-gold-grad bg-clip-text text-transparent">in Minutes</span>
          </h2>
          <p className="mt-5 text-background/70 text-base sm:text-lg leading-relaxed">
            Securely connect and manage your routers from anywhere in just a few simple steps.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-background/60 text-xs">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-secondary" /> Encrypted REST API</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-secondary" /> No firewall headaches</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-secondary" /> Beginner-friendly</span>
          </div>
          <div className="mt-7">
            <Button size="lg" variant="hero" onClick={() => setDemoOpen(true)}>
              <PlayCircle className="mr-1 h-4 w-4" /> Try the interactive demo
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* vertical line for mobile, center line for desktop */}
          <div className="absolute left-5 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-secondary/0 via-secondary/40 to-secondary/0 md:-translate-x-1/2" />

          <div className="space-y-10 md:space-y-16">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const left = i % 2 === 0;
              return (
                <div
                  key={s.n}
                  className="relative md:grid md:grid-cols-2 md:gap-12 items-center animate-fade-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* node */}
                  <div className="absolute left-5 md:left-1/2 -translate-x-1/2 top-2 z-10">
                    <div className="h-10 w-10 rounded-full bg-emerald-grad grid place-items-center shadow-gold ring-4 ring-[hsl(210_60%_8%)]">
                      <Icon className="h-4 w-4 text-background" />
                    </div>
                  </div>

                  {/* text */}
                  <div className={`pl-16 md:pl-0 ${left ? "md:pr-14 md:text-right md:col-start-1" : "md:pl-14 md:col-start-2"}`}>
                    <span className="font-mono text-[11px] tracking-widest text-secondary/80">STEP {s.n}</span>
                    <h3 className="mt-1 font-display text-xl sm:text-2xl font-bold text-background">{s.title}</h3>
                    <p className="mt-2 text-background/65 text-sm leading-relaxed">{s.desc}</p>
                    {s.badge && (
                      <span className={`inline-flex items-center gap-1.5 mt-3 text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary px-2.5 py-1 rounded-full ${left ? "md:ml-auto" : ""}`}>
                        <Check className="h-3 w-3" /> {s.badge}
                      </span>
                    )}
                  </div>

                  {/* mock */}
                  <div className={`pl-16 md:pl-0 mt-5 md:mt-0 ${left ? "md:col-start-2" : "md:col-start-1 md:row-start-1"}`}>
                    <Card className="bg-background/[0.03] border-background/10 p-3 backdrop-blur-sm hover:border-secondary/30 hover:-translate-y-1 transition-all duration-300 shadow-elegant">
                      {s.mock}
                    </Card>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="relative mt-24 rounded-3xl bg-background/[0.04] border border-secondary/20 backdrop-blur-sm p-10 sm:p-14 text-center overflow-hidden">
          <div className="absolute -top-20 -left-10 h-56 w-56 bg-secondary/20 blur-3xl rounded-full" />
          <div className="absolute -bottom-20 -right-10 h-56 w-56 bg-primary-glow/20 blur-3xl rounded-full" />
          <h3 className="relative font-display text-2xl sm:text-4xl font-bold text-background text-balance">
            Ready to Connect Your First Router?
          </h3>
          <p className="relative text-background/70 mt-3 max-w-xl mx-auto">
            Get started in minutes — no complicated networking setup required.
          </p>
          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" variant="hero">
              <Link to="/register">Start Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline-light" onClick={() => setDemoOpen(true)}>
              <PlayCircle className="mr-1 h-4 w-4" /> Watch Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
