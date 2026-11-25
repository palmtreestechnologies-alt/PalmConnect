import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, ChevronLeft, ChevronRight, Sparkles, Loader2, Plug, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { testRouterConnection } from "@/lib/routerOsClient";
import { toast } from "sonner";
import { z } from "zod";

const connectionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  host: z.string().trim().min(3).max(120),
  api_port: z.coerce.number().int().min(1).max(65535),
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(120),
});

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

const STEP_TITLES = ["Connection", "Device details", "Service setup"];

export function ProvisioningWizard({ open, onOpenChange, onCreated }: Props) {
  const { businessId } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    | { ok: true; latencyMs: number; identity: string; routerosVersion: string }
    | { ok: false; message: string }
    | null
  >(null);

  const [conn, setConn] = useState({
    name: "",
    host: "",
    api_port: "443",
    username: "admin",
    password: "",
  });

  const [device, setDevice] = useState({
    model: "hAP ax3",
    routeros_version: "7.15",
    location: "",
    notes: "",
  });

  const [service, setService] = useState({
    ssid: "",
    hotspot_interface: "bridge-hotspot",
    dns: "1.1.1.1, 8.8.8.8",
    redirect_url: "",
  });

  const fetchSnippet = useMemo(() => {
    const url = `${window.location.origin}/api/provision/${conn.host || "ROUTER"}.rsc`;
    return `/tool fetch url="${url}" mode=https keep-result=no\n/import file-name=provision.rsc`;
  }, [conn.host]);

  function reset() {
    setStep(0);
    setConn({ name: "", host: "", api_port: "443", username: "admin", password: "" });
    setDevice({ model: "hAP ax3", routeros_version: "7.15", location: "", notes: "" });
    setService({ ssid: "", hotspot_interface: "bridge-hotspot", dns: "1.1.1.1, 8.8.8.8", redirect_url: "" });
    setCopied(false);
    setTestResult(null);
    setTesting(false);
  }

  function next() {
    if (step === 0) {
      const parsed = connectionSchema.safeParse(conn);
      if (!parsed.success) {
        toast.error(parsed.error.errors[0].message);
        return;
      }
      if (!testResult?.ok) {
        toast.error("Run a successful connection test before continuing");
        return;
      }
    }
    setStep((s) => Math.min(2, s + 1));
  }

  async function testConnection() {
    const parsed = connectionSchema.safeParse(conn);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = await testRouterConnection({
      host: conn.host,
      port: Number(conn.api_port),
      username: conn.username,
      password: conn.password,
    });
    if (result.ok) {
      const ok = {
        ok: true as const,
        latencyMs: result.latencyMs,
        identity: result.identity || conn.name || conn.host,
        routerosVersion: result.version || "7.x",
      };
      setTestResult(ok);
      toast.success(`Connected in ${result.latencyMs}ms`);
      // Pre-fill the device step if we got a real version back.
      if (result.version) setDevice((d) => ({ ...d, routeros_version: result.version }));
    } else {
      const msg = (result as { message?: string }).message ?? "Connection failed";
      setTestResult({ ok: false, message: msg });
      toast.error(msg);
    }
    setTesting(false);
  }

  async function finish() {
    if (!businessId) return;
    setSaving(true);
    const { error } = await supabase.from("routers").insert({
      business_id: businessId,
      name: conn.name,
      host: conn.host,
      api_port: Number(conn.api_port),
      username: conn.username,
      password_encrypted: conn.password,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Router provisioned");
    onCreated();
    onOpenChange(false);
    reset();
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(fetchSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary" />
            Provision a MikroTik
          </DialogTitle>
          <DialogDescription>
            Step {step + 1} of 3 — {STEP_TITLES[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Progress value={((step + 1) / 3) * 100} className="h-1.5" />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            {STEP_TITLES.map((t, i) => (
              <span
                key={t}
                className={i <= step ? "text-foreground font-medium" : ""}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Friendly name</Label>
              <Input
                value={conn.name}
                onChange={(e) => {
                  setConn({ ...conn, name: e.target.value });
                  setTestResult(null);
                }}
                placeholder="Main lobby"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Host / IP</Label>
                <Input
                  value={conn.host}
                  onChange={(e) => {
                    setConn({ ...conn, host: e.target.value });
                    setTestResult(null);
                  }}
                  placeholder="192.168.88.1"
                />
              </div>
              <div className="space-y-1.5">
                <Label>API port</Label>
                <Input
                  value={conn.api_port}
                  onChange={(e) => {
                    setConn({ ...conn, api_port: e.target.value });
                    setTestResult(null);
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input
                  value={conn.username}
                  onChange={(e) => {
                    setConn({ ...conn, username: e.target.value });
                    setTestResult(null);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={conn.password}
                  onChange={(e) => {
                    setConn({ ...conn, password: e.target.value });
                    setTestResult(null);
                  }}
                />
              </div>
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Plug className="h-3.5 w-3.5" /> Verify API access
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    We'll probe the router before you continue.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={testResult?.ok ? "outline" : "secondary"}
                  onClick={testConnection}
                  disabled={testing}
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing…
                    </>
                  ) : testResult?.ok ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Test again
                    </>
                  ) : (
                    <>Test connection</>
                  )}
                </Button>
              </div>

              {testResult?.ok && (
                <Alert className="border-secondary/40 bg-secondary/10">
                  <CheckCircle2 className="h-4 w-4 text-secondary" />
                  <AlertTitle className="text-sm">Connection verified</AlertTitle>
                  <AlertDescription className="text-[11px] text-muted-foreground">
                    {testResult.identity} • RouterOS {testResult.routerosVersion} • {testResult.latencyMs} ms
                  </AlertDescription>
                </Alert>
              )}
              {testResult && !testResult.ok && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="text-sm">Connection failed</AlertTitle>
                  <AlertDescription className="text-[11px]">
                    {(testResult as { ok: false; message: string }).message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Select
                  value={device.model}
                  onValueChange={(v) => setDevice({ ...device, model: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "hAP ax3",
                      "hAP ax2",
                      "hAP ac²",
                      "RB750Gr3",
                      "RB4011",
                      "CCR2004",
                      "Other",
                    ].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>RouterOS version</Label>
                <Input
                  value={device.routeros_version}
                  onChange={(e) =>
                    setDevice({ ...device, routeros_version: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={device.location}
                onChange={(e) => setDevice({ ...device, location: e.target.value })}
                placeholder="Reception, 1st floor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                rows={3}
                value={device.notes}
                onChange={(e) => setDevice({ ...device, notes: e.target.value })}
                placeholder="Anything technicians should know"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>SSID</Label>
                <Input
                  value={service.ssid}
                  onChange={(e) => setService({ ...service, ssid: e.target.value })}
                  placeholder="PalmConnect WiFi"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hotspot interface</Label>
                <Input
                  value={service.hotspot_interface}
                  onChange={(e) =>
                    setService({ ...service, hotspot_interface: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>DNS servers</Label>
              <Input
                value={service.dns}
                onChange={(e) => setService({ ...service, dns: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Redirect URL after login (optional)</Label>
              <Input
                value={service.redirect_url}
                onChange={(e) =>
                  setService({ ...service, redirect_url: e.target.value })
                }
                placeholder="https://yourbusiness.com/welcome"
              />
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  Run on the router
                  <Badge variant="secondary" className="text-[10px]">
                    Winbox / Terminal
                  </Badge>
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copySnippet}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-foreground/90">
{fetchSnippet}
              </pre>
              <p className="text-[11px] text-muted-foreground">
                Paste this into your router's terminal to fetch and import the provisioning script.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < 2 ? (
            <Button type="button" variant="hero" onClick={next}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="hero"
              onClick={finish}
              disabled={saving}
            >
              {saving ? "Saving…" : "Finish & save"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
