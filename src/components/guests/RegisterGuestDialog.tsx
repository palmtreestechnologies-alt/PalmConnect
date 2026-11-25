import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Loader2, MessageCircle, MessageSquareText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  generatePassword, generateUsername, normalizePhone, sendGuestSms, SPEED_OPTIONS, stayToMs, STAY_LIMITS, type StayUnit,
} from "@/lib/guestLogin";

type Issued = { id: string; username: string; password: string; phone: string; devices: number; expires: string };
const FORM0 = { phone: "", devices: "1", amount: "1", unit: "days" as StayUnit, speed: "none" };

/** One-step guest registration: phone, devices, stay. Username and password are generated. */
export function RegisterGuestDialog({
  open, onOpenChange, onDone,
}: { open: boolean; onOpenChange: (o: boolean) => void; onDone?: () => void }) {
  const { businessId, user } = useAuth();
  const [form, setForm] = useState(FORM0);
  const [saving, setSaving] = useState(false);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [texting, setTexting] = useState(false);
  const [texted, setTexted] = useState(false);

  function close(o: boolean) {
    onOpenChange(o);
    if (!o) { setIssued(null); setTexted(false); setForm(FORM0); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    const phone = normalizePhone(form.phone);
    if (!phone) return toast.error("Enter a valid phone number, e.g. 0712 345 678");
    const devices = parseInt(form.devices, 10);
    if (!Number.isInteger(devices) || devices < 1 || devices > 10) return toast.error("Devices must be 1 to 10");
    const amount = parseInt(form.amount, 10);
    const max = STAY_LIMITS[form.unit];
    if (!Number.isInteger(amount) || amount < 1 || amount > max) return toast.error(`Stay must be 1 to ${max} ${form.unit}`);

    const expires = new Date(Date.now() + stayToMs(amount, form.unit)).toISOString();
    setSaving(true);
    for (let attempt = 0; attempt < 4; attempt++) {
      const row = {
        business_id: businessId, created_by: user?.id, status: "unused", expires_at: expires,
        username: generateUsername(), password: generatePassword(),
        guest_phone: phone, device_limit: devices,
        speed_kbps: SPEED_OPTIONS.find((o) => o.value === form.speed)?.kbps ?? null,
      };
      const { data, error } = await supabase.from("vouchers").insert(row).select("id").single();
      if (!error && data) {
        setSaving(false);
        setTexted(false);
        setIssued({ id: data.id, username: row.username, password: row.password, phone, devices, expires });
        onDone?.();
        return;
      }
      if (!error.message.includes("duplicate")) { setSaving(false); return toast.error(error.message); }
    }
    setSaving(false);
    toast.error("Could not create a unique login. Please try again.");
  }

  async function text() {
    if (!issued) return;
    setTexting(true);
    const err = await sendGuestSms(issued.id);
    setTexting(false);
    if (err) return toast.error(err);
    setTexted(true);
    toast.success("SMS sent");
  }

  const message = issued
    ? `Your Wi-Fi login\nUsername: ${issued.username}\nPassword: ${issued.password}\nUp to ${issued.devices} device${issued.devices > 1 ? "s" : ""}, valid until ${new Date(issued.expires).toLocaleString()}.`
    : "";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{issued ? "Give these details to the guest" : "Register guest"}</DialogTitle>
        </DialogHeader>
        {issued ? (
          <div className="space-y-3">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm text-muted-foreground">+{issued.phone}</p>
              <p>Username <span className="font-mono font-bold text-lg">{issued.username}</span></p>
              <p>Password <span className="font-mono font-bold text-lg">{issued.password}</span></p>
              <p className="text-sm text-muted-foreground">
                Up to {issued.devices} device{issued.devices > 1 ? "s" : ""} · valid until {new Date(issued.expires).toLocaleString()}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={text} disabled={texting}>
              {texting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
              {texted ? "Send SMS again" : "Send by SMS"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(message); toast.success("Copied"); }}>
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Button variant="outline" asChild>
                <a href={`https://wa.me/${issued.phone}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </Button>
            </div>
            <Button className="w-full" variant="hero" onClick={() => { setIssued(null); setForm(FORM0); }}>Register another guest</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rg-phone">Phone number</Label>
              <Input id="rg-phone" type="tel" inputMode="tel" autoComplete="off" autoFocus placeholder="0712 345 678"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rg-dev">Number of devices</Label>
                <Input id="rg-dev" type="number" inputMode="numeric" min={1} max={10}
                  value={form.devices} onChange={(e) => setForm({ ...form, devices: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rg-stay">Length of stay</Label>
                <div className="flex gap-2">
                  <Input id="rg-stay" type="number" inputMode="numeric" min={1} max={STAY_LIMITS[form.unit]} className="w-20"
                    value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as StayUnit })}>
                    <SelectTrigger aria-label="Unit"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Speed limit <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={form.speed} onValueChange={(v) => setForm({ ...form, speed: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPEED_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" variant="hero" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create login
            </Button>
            <p className="text-xs text-muted-foreground">The username and password are created for you.</p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
