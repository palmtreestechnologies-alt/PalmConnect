import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Wifi,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Radio,
  Network,
} from "lucide-react";

type ApRow = {
  id: string;
  name: string;
  brand: string;
  ssid: string;
  vlan: string;
  portal: "palmconnect" | "builtin" | "none";
  fastRoaming: boolean;
};

const BRANDS = ["MikroTik", "UniFi", "TP-Link Omada", "Grandstream", "Ruijie Reyee", "Generic"];

const seed = (): ApRow[] => [
  { id: crypto.randomUUID(), name: "Reception AP", brand: "MikroTik", ssid: "PalmGuest", vlan: "20", portal: "palmconnect", fastRoaming: true },
  { id: crypto.randomUUID(), name: "Lounge AP", brand: "UniFi", ssid: "PalmGuest", vlan: "20", portal: "palmconnect", fastRoaming: true },
  { id: crypto.randomUUID(), name: "Pool AP", brand: "TP-Link Omada", ssid: "Palm-Pool", vlan: "30", portal: "builtin", fastRoaming: false },
];

type Finding = {
  level: "ok" | "warn" | "critical";
  title: string;
  recommendation: string;
};

function validate(rows: ApRow[]): Finding[] {
  const findings: Finding[] = [];
  if (rows.length === 0) return findings;

  const ssids = new Set(rows.map((r) => r.ssid.trim()).filter(Boolean));
  if (ssids.size > 1) {
    findings.push({
      level: "critical",
      title: `${ssids.size} different SSIDs detected (${Array.from(ssids).join(", ")})`,
      recommendation: "Use a single SSID across all access points for seamless roaming.",
    });
  } else {
    findings.push({ level: "ok", title: "Single SSID across all APs", recommendation: "Guests can roam without re-authenticating." });
  }

  const vlans = new Set(rows.map((r) => r.vlan.trim()).filter(Boolean));
  if (vlans.size > 1) {
    findings.push({
      level: "critical",
      title: `Guest VLAN inconsistency (${Array.from(vlans).join(", ")})`,
      recommendation: "Guest Wi-Fi should use the same VLAN across all APs.",
    });
  } else {
    findings.push({ level: "ok", title: "Consistent Guest VLAN", recommendation: "Sessions persist as devices move between APs." });
  }

  const builtin = rows.filter((r) => r.portal === "builtin");
  if (builtin.length > 0) {
    findings.push({
      level: "warn",
      title: `${builtin.length} AP(s) still running their own captive portal`,
      recommendation: "Guest authentication should be centralized — disable built-in portals on " + builtin.map((b) => b.name).join(", ") + ".",
    });
  } else {
    findings.push({ level: "ok", title: "Captive portal centralized in Palm Connect", recommendation: "One login experience everywhere." });
  }

  const noRoam = rows.filter((r) => !r.fastRoaming);
  if (noRoam.length > 0) {
    findings.push({
      level: "warn",
      title: `Fast roaming (802.11r/k/v) disabled on ${noRoam.length} AP(s)`,
      recommendation: "Enable fast roaming for smoother handoff between " + noRoam.map((b) => b.name).join(", ") + ".",
    });
  } else {
    findings.push({ level: "ok", title: "Fast roaming enabled everywhere", recommendation: "Devices handoff in under a second." });
  }

  return findings;
}

const levelStyles: Record<Finding["level"], string> = {
  ok: "border-success/30 bg-success/5 text-success",
  warn: "border-warning/30 bg-warning/5 text-warning",
  critical: "border-destructive/30 bg-destructive/5 text-destructive",
};

const levelIcon = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  critical: AlertTriangle,
};

export default function NetworkValidator() {
  const [rows, setRows] = useState<ApRow[]>(seed());
  const [scanning, setScanning] = useState(false);
  const [findings, setFindings] = useState<Finding[] | null>(null);

  const update = (id: string, patch: Partial<ApRow>) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const addRow = () =>
    setRows((r) => [
      ...r,
      { id: crypto.randomUUID(), name: `AP ${r.length + 1}`, brand: "MikroTik", ssid: "PalmGuest", vlan: "20", portal: "palmconnect", fastRoaming: true },
    ]);

  const removeRow = (id: string) => setRows((r) => r.filter((row) => row.id !== id));

  const runScan = async () => {
    setScanning(true);
    setFindings(null);
    await new Promise((r) => setTimeout(r, 900));
    setFindings(validate(rows));
    setScanning(false);
  };

  const score = findings
    ? Math.round((findings.filter((f) => f.level === "ok").length / findings.length) * 100)
    : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-secondary text-xs font-semibold uppercase tracking-widest">
              <Network className="h-3.5 w-3.5" /> Smart Wi-Fi Validation
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold mt-1">Roaming &amp; Compatibility Check</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Add the access points deployed at your property. Palm Connect inspects SSID, VLAN, captive
              portal and fast-roaming consistency — and warns you about bad guest experiences before they happen.
            </p>
          </div>
          <Button onClick={runScan} variant="hero" disabled={scanning || rows.length === 0}>
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {scanning ? "Scanning…" : "Run validation scan"}
          </Button>
        </div>

        {/* AP inventory */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4 text-secondary" /> Access Point inventory
            </h2>
            <Button onClick={addRow} size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5" /> Add AP
            </Button>
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-xl border border-border bg-background/60"
              >
                <div className="md:col-span-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Name</Label>
                  <Input value={row.name} onChange={(e) => update(row.id, { name: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Brand</Label>
                  <select
                    value={row.brand}
                    onChange={(e) => update(row.id, { brand: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {BRANDS.map((b) => (
                      <option key={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">SSID</Label>
                  <Input value={row.ssid} onChange={(e) => update(row.id, { ssid: e.target.value })} />
                </div>
                <div className="md:col-span-1">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">VLAN</Label>
                  <Input value={row.vlan} onChange={(e) => update(row.id, { vlan: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Captive Portal</Label>
                  <select
                    value={row.portal}
                    onChange={(e) => update(row.id, { portal: e.target.value as ApRow["portal"] })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="palmconnect">Palm Connect</option>
                    <option value="builtin">Built-in (AP)</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex items-end gap-2">
                  <label className="flex items-center gap-2 text-xs text-foreground/80 h-10">
                    <input
                      type="checkbox"
                      checked={row.fastRoaming}
                      onChange={(e) => update(row.id, { fastRoaming: e.target.checked })}
                      className="h-4 w-4 rounded accent-[hsl(var(--secondary))]"
                    />
                    Fast roaming (11r/k/v)
                  </label>
                </div>
                <div className="md:col-span-1 flex items-end justify-end">
                  <Button size="icon" variant="ghost" onClick={() => removeRow(row.id)} aria-label="Remove">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No APs yet — click <span className="font-semibold">Add AP</span> to start.
              </p>
            )}
          </div>
        </Card>

        {/* Findings */}
        {findings && (
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-secondary" /> Validation results
              </h2>
              {score !== null && (
                <Badge
                  variant="outline"
                  className={
                    score >= 80
                      ? "border-success/40 text-success"
                      : score >= 50
                      ? "border-warning/40 text-warning"
                      : "border-destructive/40 text-destructive"
                  }
                >
                  Roaming health: {score}%
                </Badge>
              )}
            </div>
            <Separator className="my-4" />
            <div className="space-y-3">
              {findings.map((f, i) => {
                const Icon = levelIcon[f.level];
                return (
                  <div
                    key={i}
                    className={`p-4 rounded-xl border flex items-start gap-3 ${levelStyles[f.level]}`}
                  >
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{f.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{f.recommendation}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Help */}
        <Card className="p-5 sm:p-6 bg-muted/40 border-dashed">
          <div className="flex items-start gap-3">
            <Wifi className="h-5 w-5 text-secondary mt-0.5" />
            <div className="text-sm text-foreground/80 leading-relaxed">
              <p className="font-semibold text-foreground">Roaming rule of thumb</p>
              <p className="mt-1">
                One SSID. One Guest VLAN. One captive portal (Palm Connect). Authentication is bound to the
                guest's MAC address or voucher token — never to a specific AP — so a guest stays connected
                from the lounge to the pool to their room.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
