import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

// 192.168.88.0/24 is MikroTik's own factory LAN, so it is not the default: it clashes on a router that still has its default setup.
const NETWORKS = ["10.10.0.0/24", "172.16.10.0/24", "192.168.88.0/24"];
const IFACE = /^[A-Za-z0-9._-]{1,15}$/;
const ALL_PORTS = "palm-bridge"; // every port except ether1, plus Wi-Fi
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function ConnectRouterDialog({ open, onOpenChange, onCreated }: Props) {
  const { businessId } = useAuth();
  const [name, setName] = useState("");
  const [allPorts, setAllPorts] = useState(true);
  const [single, setSingle] = useState("");
  const [ssid, setSsid] = useState("");
  const [cidr, setCidr] = useState(NETWORKS[0]);
  const [saving, setSaving] = useState(false);
  const [routerId, setRouterId] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>();

  const nameErr = name.trim().length < 2 ? "Enter a name, for example Reception." : "";
  const ssidErr = allPorts && !/^[A-Za-z0-9 _-]{1,32}$/.test(ssid.trim()) ? "Enter the Wi-Fi name guests will see. Letters, numbers, spaces, - and _ only." : "";
  const iface = allPorts ? ALL_PORTS : single;
  const ifaceErr = IFACE.test(iface) ? "" : "Use the exact interface name from WinBox, for example ether5 or wlan1.";

  function reset() {
    setName(""); setAllPorts(true); setSingle(""); setSsid(""); setCidr(NETWORKS[0]); setRouterId(null); setCommand(""); setConnected(false); setCopied(false);
  }

  // After the command is shown, check every 5 seconds whether the router has called in.
  useEffect(() => {
    if (!routerId || connected) return;
    timer.current = window.setInterval(async () => {
      const { data } = await supabase.from("routers").select("status,provisioned_at,last_seen_at").eq("id", routerId).maybeSingle();
      if (data?.provisioned_at && data.last_seen_at && new Date(data.last_seen_at) > new Date(data.provisioned_at)) {
        setConnected(true);
        onCreated();
      }
    }, 5000);
    return () => window.clearInterval(timer.current);
  }, [routerId, connected, onCreated]);

  async function createCommand() {
    if (!businessId || nameErr || ifaceErr || ssidErr) return;
    setSaving(true);
    const { data: row, error } = await supabase
      .from("routers")
      .insert({ business_id: businessId, name: name.trim(), connection_mode: "agent", hotspot_interface: iface, hotspot_cidr: cidr, wifi_ssid: allPorts ? ssid.trim() : null })
      .select("id")
      .single();
    if (error || !row) {
      setSaving(false);
      toast.error(error?.message.includes("row-level security")
        ? "Your plan's router limit is reached. Upgrade your plan to add another router."
        : "Could not add the router. Please try again.");
      return;
    }
    const { data: token, error: tokErr } = await supabase.rpc("create_provisioning_token", { _router_id: row.id });
    setSaving(false);
    if (tokErr || !token) {
      toast.error("Could not create the setup command. Please try again.");
      return;
    }
    setRouterId(row.id);
    setCommand(
      `/tool fetch url="${SUPABASE_URL}/functions/v1/router-agent/setup/${token}" check-certificate=no dst-path=palm.rsc; :delay 2s; /import palm.rsc`,
    );
    onCreated();
  }

  async function copy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect a MikroTik router</DialogTitle>
          <DialogDescription>
            Paste one command into the router's terminal. It sets itself up as a Wi-Fi hotspot and links to your account.
          </DialogDescription>
        </DialogHeader>

        {!routerId && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="r-name">Router name</Label>
              <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Reception" />
              {name && nameErr && <p className="text-sm text-destructive">{nameErr}</p>}
            </div>
            {allPorts && (
              <div className="space-y-1.5">
                <Label htmlFor="r-ssid">Wi-Fi name for guests</Label>
                <Input id="r-ssid" value={ssid} onChange={(e) => setSsid(e.target.value.replace(/[^A-Za-z0-9 _-]/g, "").slice(0, 32))} placeholder="Hotel Guest" />
                <p className="text-xs text-muted-foreground">The router makes this Wi-Fi itself and shows the guest login page when someone joins.</p>
                {ssid && ssidErr && <p className="text-sm text-destructive">{ssidErr}</p>}
              </div>
            )}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Which ports are for guests and staff?</legend>
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="r-ports" className="mt-1" checked={allPorts} onChange={() => setAllPorts(true)} />
                <span><b>All ports except ether1</b> (recommended)<br />
                  <span className="text-muted-foreground">ether1 is your internet from the modem. Every other port and the router's Wi-Fi join the guest network.</span></span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="r-ports" className="mt-1" checked={!allPorts} onChange={() => setAllPorts(false)} />
                <span><b>One port only</b> (advanced)</span>
              </label>
              {!allPorts && (
                <div className="space-y-1.5 pl-6">
                  <Label htmlFor="r-if">Port name</Label>
                  <Input id="r-if" value={single} onChange={(e) => setSingle(e.target.value.trim())} placeholder="ether5" />
                  <p className="text-sm text-muted-foreground">Use the exact name from WinBox. Not the internet port, and not the one you manage the router from.</p>
                  {single && ifaceErr && <p className="text-sm text-destructive">{ifaceErr}</p>}
                </div>
              )}
            </fieldset>
            <div className="space-y-1.5">
              <Label htmlFor="r-net">Guest network</Label>
              <select id="r-net" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={cidr} onChange={(e) => setCidr(e.target.value)}>
                {NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <Button className="w-full" onClick={createCommand} disabled={saving || !!nameErr || !!ifaceErr || !!ssidErr}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create setup command
            </Button>
          </div>
        )}

        {routerId && !connected && (
          <div className="space-y-4">
            <ol className="list-decimal space-y-2 pl-5 text-sm">
              <li>Plug the cable from your modem or internet provider into the port marked <b>ether1</b>.</li>
              <li>Connect your computer to the router and open <b>WinBox</b>, then click <b>New Terminal</b>.</li>
              <li>
                <b>Brand-new or reset router only:</b> paste this first so ether1 gets internet, then press Enter.
                <Textarea readOnly rows={1} className="mt-1 font-mono text-xs" value="/ip dhcp-client add interface=ether1 disabled=no" onFocus={(e) => e.currentTarget.select()} />
                <span className="text-xs text-muted-foreground">Already online through ether1? Skip this.</span>
              </li>
              <li>Paste the setup command below and press Enter. Wait until it says <b>setup complete</b>.</li>
            </ol>
            <Textarea readOnly value={command} className="font-mono text-xs" rows={5} onFocus={(e) => e.currentTarget.select()} />
            <Button variant="outline" className="w-full" onClick={copy}>
              <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy command"}
            </Button>
            <p className="text-sm text-muted-foreground">
              The command works once and expires in 60 minutes. The router saves a backup named palm-pre-setup before it changes anything.
            </p>
            <p className="text-sm text-muted-foreground">If the terminal shows an error, copy it and send it to support. Nothing on your router is deleted without a saved backup.</p>
            <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for the router to connect…</p>
          </div>
        )}

        {connected && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <p className="font-medium">{name} is connected.</p>
            {allPorts && ssid && <p className="text-sm text-muted-foreground">Wi-Fi <b>{ssid}</b> is on. Join it from a phone to see the guest login page.</p>}
            <div className="rounded-lg border bg-muted/40 p-3 text-left text-sm">
              <p className="font-medium">Test it</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>Join the Wi-Fi from your phone.</li>
                <li>Open any website. The guest login page appears.</li>
                <li>Register a guest in <b>Vouchers</b> and sign in with the login we create.</li>
              </ol>
            </div>
            <Button className="w-full" onClick={() => { onOpenChange(false); reset(); }}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
