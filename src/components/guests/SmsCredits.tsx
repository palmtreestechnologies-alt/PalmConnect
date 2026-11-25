import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, MessageSquareText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Pack = { id: string; code: string; name: string; credits: number; price_cents: number };

/** Shows the SMS balance and lets the owner buy a bundle with M-Pesa (paid to Palm Trees). */
export function SmsCredits() {
  const { businessId } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    const [{ data: b }, { data: p }] = await Promise.all([
      supabase.from("sms_balance").select("credits").eq("business_id", businessId).maybeSingle(),
      supabase.from("sms_packs").select("id, code, name, credits, price_cents").order("sort_order"),
    ]);
    setCredits(b?.credits ?? 0);
    setPacks((p as Pack[]) ?? []);
  }, [businessId]);
  useEffect(() => { load(); }, [load]);

  async function buy(pack: Pack) {
    if (!/^(?:\+?254|0)?(7|1)\d{8}$/.test(phone.replace(/\s/g, ""))) return toast.error("Enter a valid Kenyan M-Pesa number");
    setBusy(pack.code);
    const { data, error } = await supabase.functions.invoke("sms-checkout", { body: { phone, pack_code: pack.code } });
    if (error || !data?.ok) {
      setBusy(null);
      return toast.error(data?.message ?? "Could not start the M-Pesa prompt. Try again.");
    }
    toast.success(`Check your phone and enter your M-Pesa PIN to pay KSh ${data.amount.toLocaleString()}`);
    const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/payment-status?ref=${encodeURIComponent(data.checkout_request_id)}`;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(url).then((r) => r.json()).catch(() => null);
      if (res?.status === "paid") {
        setBusy(null); await load(); setOpen(false);
        return toast.success(`${pack.credits.toLocaleString()} SMS added`);
      }
      if (res?.status === "failed" || res?.status === "cancelled") {
        setBusy(null);
        return toast.error(res.status === "cancelled" ? "Payment cancelled" : "Payment failed. You have not been charged.");
      }
    }
    setBusy(null);
    toast.message("Still waiting for M-Pesa", { description: "If you paid, your SMS credits appear within a minute." });
    load();
  }

  return (
    <>
      <Button variant="outline" onClick={() => { setOpen(true); load(); }}>
        <MessageSquareText className="h-4 w-4" /> SMS: {credits ?? "…"} · Buy SMS
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Buy SMS credits</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You have <span className="font-semibold text-foreground">{credits ?? 0}</span> SMS left. Each login you text to a guest uses one.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="sms-phone">M-Pesa number to pay with</Label>
              <Input id="sms-phone" type="tel" inputMode="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              {packs.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">KSh {(p.price_cents / 100 / p.credits).toFixed(2)} per SMS</p>
                  </div>
                  <Button variant="hero" disabled={!!busy} onClick={() => buy(p)}>
                    {busy === p.code ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    KSh {(p.price_cents / 100).toLocaleString()}
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Paid to Palm Trees Technologies by M-Pesa. Credits never expire.</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
