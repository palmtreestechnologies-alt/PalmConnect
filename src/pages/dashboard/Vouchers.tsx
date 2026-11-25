import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Ticket as TicketIcon, Download, Search, MessageSquareText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { SmsCredits } from "@/components/guests/SmsCredits";
import { RegisterGuestDialog } from "@/components/guests/RegisterGuestDialog";
import { randomCode as rand, sendGuestSms } from "@/lib/guestLogin";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import { useBrand } from "@/components/brand/BrandingProvider";
import { hexToRgb, readableOn } from "@/lib/branding";

export default function Vouchers() {
  const { businessId, user } = useAuth();
  const brand = useBrand();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [bulk, setBulk] = useState({ count: "10", package_id: "", prefix: "PT" });
  const [guestOpen, setGuestOpen] = useState(false);

  async function load() {
    if (!businessId) return;
    const [{ data: v }, { data: p }] = await Promise.all([
      supabase.from("vouchers").select("*, packages(name, duration_minutes, device_limit)").eq("business_id", businessId).order("created_at", { ascending: false }).limit(500),
      supabase.from("packages").select("*").eq("business_id", businessId).eq("active", true),
    ]);
    setVouchers(v ?? []); setPackages(p ?? []);
  }
  useEffect(() => { load(); }, [businessId]);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    const count = Math.min(Math.max(parseInt(bulk.count) || 1, 1), 500);
    const pkg = packages.find((x) => x.id === bulk.package_id);
    if (!pkg) { toast.error("Pick a package first"); return; }
    const batch_id = crypto.randomUUID();
    const expires = new Date(Date.now() + pkg.duration_minutes * 60000).toISOString();
    const rows = Array.from({ length: count }).map(() => ({
      business_id: businessId, package_id: pkg.id, batch_id, created_by: user?.id,
      username: bulk.prefix + rand(6),
      password: rand(8), expires_at: expires, status: "unused",
    }));
    const { error } = await supabase.from("vouchers").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(`${count} vouchers generated`); setOpen(false); load();
  }

  async function exportPDF() {
    const list = filtered.slice(0, 60);
    if (list.length === 0) { toast.error("No vouchers"); return; }
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const col = brand.primary ?? "#0B3B2B";
    const [pr, pg, pb] = hexToRgb(col);
    const onCol = readableOn(col) === "dark" ? [255, 255, 255] : [20, 20, 20];
    let logo: { data: string; w: number; h: number } | null = null;
    if (brand.logoUrl) {
      try {
        const blob = await (await fetch(brand.logoUrl)).blob();
        const data = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(blob); });
        const dim = await new Promise<{ w: number; h: number }>((res, rej) => { const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = rej; im.src = data; });
        logo = { data, ...dim };
      } catch { /* print without the logo */ }
    }
    const title = brand.name ? `${brand.name} WiFi` : "WiFi";
    const cardW = 90, cardH = 50, marginX = 15, marginY = 15, gap = 5;
    let x = marginX, y = marginY;
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      const loginUrl = `wifi:${v.username}:${v.password}`;
      const qr = await QRCode.toDataURL(loginUrl, { margin: 0, width: 200 });
      doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.4);
      doc.roundedRect(x, y, cardW, cardH, 3, 3);
      doc.setFillColor(pr, pg, pb); doc.rect(x, y, cardW, 8, "F");
      let tx = x + 3;
      if (logo) {
        const h = 6, w = Math.min(20, (logo.w / logo.h) * h);
        const fmt = logo.data.startsWith("data:image/png") ? "PNG" : logo.data.startsWith("data:image/webp") ? "WEBP" : "JPEG";
        try { doc.addImage(logo.data, fmt, x + 2, y + 1, w, h); tx = x + w + 4; } catch { /* skip */ }
      }
      doc.setTextColor(onCol[0], onCol[1], onCol[2]); doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text(doc.splitTextToSize(title, cardW - (tx - x) - 2)[0], tx, y + 5.5);
      doc.setTextColor(20, 20, 20);
      doc.addImage(qr, "PNG", x + cardW - 32, y + 12, 28, 28);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text("Username", x + 4, y + 16);
      doc.setFontSize(13); doc.setFont("courier", "bold");
      doc.text(v.username, x + 4, y + 22);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text("Password", x + 4, y + 30);
      doc.setFontSize(13); doc.setFont("courier", "bold");
      doc.text(v.password, x + 4, y + 36);
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(110,110,110);
      doc.text(`Duration: ${v.packages?.name ?? ""} • One-device only`, x + 4, y + 45);
      doc.setTextColor(20,20,20);
      x += cardW + gap;
      if (x + cardW > 210 - marginX) { x = marginX; y += cardH + gap; }
      if (y + cardH > 297 - marginY) { doc.addPage(); x = marginX; y = marginY; }
    }
    doc.save(`vouchers-${Date.now()}.pdf`);
  }

  const filtered = vouchers.filter((v) =>
    !q || v.username.toLowerCase().includes(q.toLowerCase()) || v.password.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Vouchers</h1>
            <p className="text-sm text-muted-foreground">Register a guest with their phone, devices and stay. The login is created for you.</p>
          </div>
          <div className="flex gap-2">
            <SmsCredits/>
            <Button variant="outline" onClick={exportPDF} disabled={filtered.length===0}><Download className="h-4 w-4"/>Export PDF</Button>
            <Button variant="hero" onClick={()=>setGuestOpen(true)}><Plus className="h-4 w-4"/>Register guest</Button>
            <RegisterGuestDialog open={guestOpen} onOpenChange={setGuestOpen} onDone={load}/>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4"/>Bulk generate</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Bulk generate vouchers</DialogTitle></DialogHeader>
                <form onSubmit={generate} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Package</Label>
                    <Select value={bulk.package_id} onValueChange={(v)=>setBulk({...bulk, package_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Choose package"/></SelectTrigger>
                      <SelectContent>{packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {packages.length===0 && <p className="text-xs text-warning">Create a package first.</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Count (max 500)</Label><Input type="number" min={1} max={500} value={bulk.count} onChange={(e)=>setBulk({...bulk,count:e.target.value})}/></div>
                    <div className="space-y-1.5"><Label>Prefix</Label><Input maxLength={4} value={bulk.prefix} onChange={(e)=>setBulk({...bulk,prefix:e.target.value.toUpperCase()})}/></div>
                  </div>
                  <Button type="submit" className="w-full" variant="hero" disabled={packages.length===0}>Generate</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search by username or password" className="pl-9"/>
        </div>

        {filtered.length === 0 ? (
          <Card className="p-12 bg-card-grad text-center">
            <TicketIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3"/>
            <h3 className="font-display font-semibold text-lg">No vouchers yet</h3>
            <p className="text-sm text-muted-foreground">Generate your first batch — they'll appear here ready to print.</p>
          </Card>
        ) : (
          <Card className="bg-card-grad overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Guest phone</TableHead><TableHead>Username</TableHead><TableHead>Password</TableHead><TableHead>Devices</TableHead><TableHead>Speed</TableHead><TableHead>Package</TableHead><TableHead>Status</TableHead><TableHead>Expires</TableHead><TableHead>Created</TableHead><TableHead className="w-12"/></TableRow></TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.guest_phone ? `+${v.guest_phone}` : v.guest_name ? <>{v.guest_name}{v.room ? <span className="text-muted-foreground"> · {v.room}</span> : null}</> : "—"}</TableCell>
                    <TableCell className="font-mono font-semibold">{v.username}</TableCell>
                    <TableCell className="font-mono">{v.password}</TableCell>
                    <TableCell>{v.device_limit ?? v.packages?.device_limit ?? 1}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.speed_kbps ? `${v.speed_kbps/1024} Mbps` : v.packages?.name ? "Package" : "No limit"}</TableCell>
                    <TableCell>{v.packages?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={
                        v.status==="unused" ? "bg-success/15 text-success" :
                        v.status==="active" ? "bg-primary/15 text-primary" :
                        "bg-muted"
                      }>{v.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{v.expires_at ? new Date(v.expires_at).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {v.guest_phone && v.status !== "expired" && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Send login by SMS" title="Send login by SMS"
                          onClick={async()=>{ const e = await sendGuestSms(v.id); e ? toast.error(e) : toast.success("SMS sent"); }}>
                          <MessageSquareText className="h-4 w-4"/>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
