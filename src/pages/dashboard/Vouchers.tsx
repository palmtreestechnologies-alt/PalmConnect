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
import { Plus, Ticket as TicketIcon, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import QRCode from "qrcode";
import jsPDF from "jspdf";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// Cryptographically random, unbiased picks (never Math.random for credentials).
function rand(n: number, alphabet = ALPHABET) {
  const limit = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < n) {
    const buf = new Uint8Array(n * 2);
    crypto.getRandomValues(buf);
    for (const b of buf) { if (b < limit && out.length < n) out += alphabet[b % alphabet.length]; }
  }
  return out;
}

export default function Vouchers() {
  const { businessId, user } = useAuth();
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [bulk, setBulk] = useState({ count: "10", package_id: "", prefix: "PT" });
  const [guestOpen, setGuestOpen] = useState(false);
  const [guest, setGuest] = useState({ name: "", room: "", package_id: "", devices: "1" });
  const [issued, setIssued] = useState<{ username: string; password: string; name: string; devices: number; expires: string } | null>(null);

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

  // Front desk: one unique login per guest, with the number of devices the guest asked for.
  async function issueGuest(e: React.FormEvent) {
    e.preventDefault();
    const pkg = packages.find((x) => x.id === guest.package_id);
    if (!pkg) { toast.error("Pick a package first"); return; }
    if (!guest.name.trim()) { toast.error("Enter the guest's name"); return; }
    const devices = Math.min(Math.max(parseInt(guest.devices) || 1, 1), 10);
    const expires = new Date(Date.now() + pkg.duration_minutes * 60000).toISOString();
    for (let attempt = 0; attempt < 4; attempt++) {
      const row = {
        business_id: businessId, package_id: pkg.id, created_by: user?.id,
        username: (bulk.prefix || "PT") + rand(6), password: rand(8), expires_at: expires, status: "unused",
        guest_name: guest.name.trim(), room: guest.room.trim() || null, device_limit: devices,
      };
      const { error } = await supabase.from("vouchers").insert(row);
      if (!error) {
        setIssued({ username: row.username, password: row.password, name: row.guest_name, devices, expires });
        setGuest({ name: "", room: "", package_id: guest.package_id, devices: "1" });
        load(); return;
      }
      if (!error.message.includes("duplicate")) { toast.error(error.message); return; }
    }
    toast.error("Could not create a unique login. Try again.");
  }

  async function exportPDF() {
    const list = filtered.slice(0, 60);
    if (list.length === 0) { toast.error("No vouchers"); return; }
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cardW = 90, cardH = 50, marginX = 15, marginY = 15, gap = 5;
    let x = marginX, y = marginY;
    for (let i = 0; i < list.length; i++) {
      const v = list[i];
      const loginUrl = `wifi:${v.username}:${v.password}`;
      const qr = await QRCode.toDataURL(loginUrl, { margin: 0, width: 200 });
      doc.setDrawColor(15, 81, 50); doc.setLineWidth(0.4);
      doc.roundedRect(x, y, cardW, cardH, 3, 3);
      doc.setFillColor(15, 81, 50); doc.rect(x, y, cardW, 8, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text("PalmConnect WiFi", x + 3, y + 5.5);
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
            <p className="text-sm text-muted-foreground">Issue a unique login to each guest, with the number of devices they asked for.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportPDF} disabled={filtered.length===0}><Download className="h-4 w-4"/>Export PDF</Button>
            <Dialog open={guestOpen} onOpenChange={(o)=>{ setGuestOpen(o); if (!o) setIssued(null); }}>
              <DialogTrigger asChild><Button variant="hero"><Plus className="h-4 w-4"/>Issue guest login</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{issued ? "Give these details to the guest" : "Issue guest login"}</DialogTitle></DialogHeader>
                {issued ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border p-4 space-y-2">
                      <p className="text-sm text-muted-foreground">{issued.name}</p>
                      <p>Username <span className="font-mono font-bold text-lg">{issued.username}</span></p>
                      <p>Password <span className="font-mono font-bold text-lg">{issued.password}</span></p>
                      <p className="text-sm text-muted-foreground">Up to {issued.devices} device{issued.devices>1?"s":""} · valid until {new Date(issued.expires).toLocaleString()}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">This login works only for this guest. Do not reuse it.</p>
                    <Button className="w-full" variant="hero" onClick={()=>setIssued(null)}>Issue another</Button>
                  </div>
                ) : (
                  <form onSubmit={issueGuest} className="space-y-3">
                    <div className="space-y-1.5"><Label htmlFor="g-name">Guest name</Label><Input id="g-name" value={guest.name} onChange={(e)=>setGuest({...guest,name:e.target.value})} maxLength={80} required/></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><Label htmlFor="g-room">Room or table</Label><Input id="g-room" value={guest.room} onChange={(e)=>setGuest({...guest,room:e.target.value})} maxLength={20}/></div>
                      <div className="space-y-1.5"><Label htmlFor="g-dev">Devices</Label><Input id="g-dev" type="number" min={1} max={10} value={guest.devices} onChange={(e)=>setGuest({...guest,devices:e.target.value})}/></div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Package</Label>
                      <Select value={guest.package_id} onValueChange={(v)=>setGuest({...guest, package_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Choose package"/></SelectTrigger>
                        <SelectContent>{packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                      </Select>
                      {packages.length===0 && <p className="text-xs text-warning">Create a package first.</p>}
                    </div>
                    <Button type="submit" className="w-full" variant="hero" disabled={packages.length===0}>Create login</Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
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
              <TableHeader><TableRow><TableHead>Guest</TableHead><TableHead>Username</TableHead><TableHead>Password</TableHead><TableHead>Devices</TableHead><TableHead>Package</TableHead><TableHead>Status</TableHead><TableHead>Expires</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.guest_name ? <>{v.guest_name}{v.room ? <span className="text-muted-foreground"> · {v.room}</span> : null}</> : "—"}</TableCell>
                    <TableCell className="font-mono font-semibold">{v.username}</TableCell>
                    <TableCell className="font-mono">{v.password}</TableCell>
                    <TableCell>{v.device_limit ?? v.packages?.device_limit ?? 1}</TableCell>
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
