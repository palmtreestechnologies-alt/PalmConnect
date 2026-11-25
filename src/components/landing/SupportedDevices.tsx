import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Wifi,
  Router as RouterIcon,
  ShieldCheck,
  Check,
  Clock,
  ArrowRight,
  Cpu,
  Radio,
  Cog,
  Signal,
} from "lucide-react";

type Brand = {
  code: string;
  name: string;
  tagline: string;
  icon: typeof Wifi;
  status: "Fully supported" | "Beta" | "Generic";
  setupMins: number;
  products: { model: string; type: string }[];
  steps: { title: string; detail: string }[];
  accent: string;
};

const brands: Brand[] = [
  {
    code: "mikrotik",
    name: "MikroTik",
    tagline: "RouterOS v7 · REST API native",
    icon: RouterIcon,
    status: "Fully supported",
    setupMins: 5,
    accent: "from-secondary/30 to-secondary/5",
    products: [
      { model: "hAP ax2", type: "Router + AP" },
      { model: "RB5009", type: "Gateway" },
      { model: "Chateau LTE12", type: "Router" },
      { model: "cAP ax", type: "Ceiling AP" },
    ],
    steps: [
      { title: "Open Winbox", detail: "Login to your MikroTik with full-access credentials." },
      { title: "IP › Cloud › DDNS Enabled", detail: "Copy the *.sn.mynetname.net hostname Palm Connect will reach." },
      { title: "Enable WWW-SSL service", detail: "/ip service enable www-ssl  and set port=443." },
      { title: "Create palmapi user", detail: "/user add name=palmapi password=StrongPass123! group=full" },
      { title: "Link in Palm Connect wizard", detail: "Dashboard › Routers › Add Router · paste hostname + creds." },
    ],
  },
  {
    code: "unifi",
    name: "Ubiquiti UniFi",
    tagline: "UniFi Controller · Cloud Key / OS",
    icon: Wifi,
    status: "Fully supported",
    setupMins: 7,
    accent: "from-primary/30 to-primary/5",
    products: [
      { model: "U6 Lite", type: "Ceiling AP" },
      { model: "U6 LR", type: "Long-range AP" },
      { model: "U7 Pro", type: "WiFi 7 AP" },
    ],
    steps: [
      { title: "Open UniFi Controller", detail: "Sign in to unifi.ui.com or your local controller." },
      { title: "Create one Guest SSID", detail: "Use the SAME SSID name on every AP across the property." },
      { title: "WLAN › Advanced › Guest Hotspot", detail: "Disable UniFi's built-in portal — Palm Connect handles authentication." },
      { title: "Assign Guest VLAN", detail: "Tag the guest network on a single VLAN (e.g. VLAN 20) on every AP." },
      { title: "Enable Fast Roaming (802.11r/k/v)", detail: "WLAN › Advanced · turn on for seamless handoff between APs." },
    ],
  },
  {
    code: "omada",
    name: "TP-Link Omada",
    tagline: "Omada Controller / Hardware OC200",
    icon: Signal,
    status: "Fully supported",
    setupMins: 8,
    accent: "from-warning/30 to-warning/5",
    products: [
      { model: "EAP610", type: "Ceiling AP" },
      { model: "EAP650", type: "WiFi 6 AP" },
      { model: "EAP670", type: "High-density AP" },
    ],
    steps: [
      { title: "Open Omada Controller", detail: "Settings › Wireless Networks." },
      { title: "Create one Guest SSID", detail: "Same name across all EAPs. Tag VLAN for guest traffic." },
      { title: "Disable Omada portal", detail: "Authentication › Portal · turn OFF. Palm Connect runs the captive portal." },
      { title: "Enable Mesh + Fast Roaming", detail: "Settings › WLAN Schedule · enable 11k/v/r." },
      { title: "Set Guest Network isolation", detail: "Guest Network ON so devices can't see each other." },
    ],
  },
  {
    code: "grandstream",
    name: "Grandstream",
    tagline: "GWN Cloud or local controller",
    icon: Radio,
    status: "Beta",
    setupMins: 10,
    accent: "from-accent/30 to-accent/5",
    products: [
      { model: "GWN7660", type: "WiFi 6 AP" },
      { model: "GWN7664", type: "Tri-band AP" },
    ],
    steps: [
      { title: "Open GWN Cloud", detail: "Network › SSIDs · create a single Guest SSID." },
      { title: "VLAN consistency", detail: "Apply the same VLAN tag across every Grandstream AP." },
      { title: "Disable internal captive portal", detail: "Captive Portal › OFF (Palm Connect takes over)." },
      { title: "Enable 802.11k/v for roaming", detail: "Advanced › Roaming Assistance." },
    ],
  },
  {
    code: "reyee",
    name: "Ruijie Reyee",
    tagline: "Reyee Mesh · Ruijie Cloud",
    icon: Cpu,
    status: "Beta",
    setupMins: 10,
    accent: "from-success/30 to-success/5",
    products: [
      { model: "RG-RAP2260", type: "WiFi 6 AP" },
      { model: "RG-RAP2200", type: "Indoor AP" },
    ],
    steps: [
      { title: "Open Ruijie Cloud", detail: "Wireless › SSID. Use one SSID for the whole property." },
      { title: "Bridge mode for guest VLAN", detail: "Tag guest VLAN across all APs." },
      { title: "Disable Reyee portal", detail: "Authentication › OFF. Point internet through MikroTik gateway." },
      { title: "Enable Mesh + Roaming", detail: "Reyee Mesh ON for handoff between APs." },
    ],
  },
  {
    code: "generic",
    name: "Generic / Other APs",
    tagline: "Any 802.11 access point",
    icon: Cog,
    status: "Generic",
    setupMins: 15,
    accent: "from-muted to-background",
    products: [
      { model: "Any brand", type: "WiFi 5/6 AP" },
      { model: "Any brand", type: "Mesh node" },
    ],
    steps: [
      { title: "Use ONE SSID across the property", detail: "Same network name = seamless roaming." },
      { title: "Same Guest VLAN on every AP", detail: "Palm Connect identifies guests by MAC, not by AP." },
      { title: "Central authentication via MikroTik gateway", detail: "All guest traffic flows through your MikroTik router." },
      { title: "Enable Guest Network isolation", detail: "Block client-to-client on the guest SSID." },
      { title: "Disable each AP's built-in portal", detail: "Palm Connect is the only captive portal." },
    ],
  },
];

const statusStyles: Record<Brand["status"], string> = {
  "Fully supported": "bg-success/15 text-success border-success/30",
  Beta: "bg-warning/15 text-warning border-warning/30",
  Generic: "bg-muted text-muted-foreground border-border",
};

export default function SupportedDevices() {
  const [active, setActive] = useState<string>("mikrotik");
  const current = brands.find((b) => b.code === active) ?? brands[0];

  return (
    <section id="supported-devices" className="py-20 px-4 sm:px-6 bg-muted/40 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-secondary text-sm font-semibold uppercase tracking-widest mb-3">
            Works With Your Existing Wi-Fi Equipment
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground text-balance">
            Mix any brands. One seamless guest experience.
          </h2>
          <p className="text-muted-foreground mt-3">
            Palm Connect is the centralized hospitality Wi-Fi management layer. Your access points stay —
            we add authentication, captive portal, vouchers, sessions and analytics on top.
          </p>
        </div>

        {/* Brand picker */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-10">
          {brands.map((b) => {
            const isActive = b.code === active;
            return (
              <button
                key={b.code}
                onClick={() => setActive(b.code)}
                className={`text-left p-4 rounded-2xl border transition-all bg-card ${
                  isActive
                    ? "border-secondary shadow-elegant scale-[1.02]"
                    : "border-border hover:border-secondary/40"
                }`}
              >
                <div className={`h-9 w-9 rounded-lg grid place-items-center mb-2 bg-gradient-to-br ${b.accent}`}>
                  <b.icon className="h-4 w-4 text-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground leading-tight">{b.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{b.tagline}</p>
                <span
                  className={`mt-2 inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusStyles[b.status]}`}
                >
                  {b.status}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active brand detail */}
        <Card className="mt-8 p-6 sm:p-8 bg-card-grad border-border">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left: device showcase */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-xl grid place-items-center bg-gradient-to-br ${current.accent}`}>
                  <current.icon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground">{current.name}</h3>
                  <p className="text-xs text-muted-foreground">{current.tagline}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-secondary/40 text-secondary">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Works with Palm Connect
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" /> ~{current.setupMins} min setup
                </Badge>
                <span
                  className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${statusStyles[current.status]}`}
                >
                  {current.status}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2.5">
                {current.products.map((p) => (
                  <div
                    key={p.model + p.type}
                    className="p-3 rounded-xl border border-border bg-background/60 hover:border-secondary/40 transition"
                  >
                    <div className="aspect-[5/3] rounded-lg bg-gradient-to-br from-muted to-background grid place-items-center mb-2 overflow-hidden">
                      <current.icon className="h-7 w-7 text-foreground/40" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">{p.model}</p>
                    <p className="text-[10px] text-muted-foreground">{p.type}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: setup walkthrough */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-display text-lg font-semibold text-foreground">Quick setup guide</h4>
                <Button asChild size="sm" variant="ghost" className="text-secondary">
                  <a href="/mikrotik-setup-card.pdf" download>
                    Download PDF <ArrowRight className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              </div>
              <Accordion type="single" collapsible defaultValue="step-0" className="space-y-2">
                {current.steps.map((s, i) => (
                  <AccordionItem
                    key={i}
                    value={`step-${i}`}
                    className="rounded-xl border border-border bg-background/60 px-4 data-[state=open]:border-secondary/40"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        <span className="h-7 w-7 rounded-full bg-emerald-grad text-background grid place-items-center text-xs font-bold shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-sm font-semibold text-foreground">{s.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pl-10 pb-4 leading-relaxed">
                      {s.detail}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="mt-6 p-4 rounded-xl border border-secondary/20 bg-secondary/5 flex items-start gap-3">
                <Check className="h-4 w-4 text-secondary mt-0.5 shrink-0" />
                <p className="text-xs text-foreground/80 leading-relaxed">
                  <span className="font-semibold text-foreground">Roaming rule of thumb:</span> one SSID,
                  one Guest VLAN, one captive portal (Palm Connect). Your guests log in once and stay
                  connected from the lounge to the pool to their room.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Mixed deployment showcase */}
        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {[
            { title: "MikroTik + UniFi", body: "RB5009 gateway with U6 Lite APs across guest rooms." },
            { title: "MikroTik + Omada", body: "hAP ax2 router with EAP650 APs in lounge and pool." },
            { title: "Fully mixed", body: "MikroTik reception · UniFi lounge · Omada pool — all on one SSID." },
          ].map((m) => (
            <Card key={m.title} className="p-5 bg-card border-border hover:border-secondary/40 transition">
              <div className="flex items-center gap-2 text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Verified deployment
              </div>
              <p className="font-display font-semibold text-foreground">{m.title}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{m.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
