import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, UserCog, Trash2, RefreshCw, Eye, EyeOff, Copy, Printer, Pencil, Wifi, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import { syncStaffToRouter, buildRateLimit } from "@/lib/mikrotikSync";

type StaffRow = {
  id: string;
  business_id: string;
  router_id: string | null;
  package_id: string | null;
  staff_name: string;
  role_label: string | null;
  username: string;
  password: string;
  mac_address: string | null;
  phone: string | null;
  enabled: boolean;
  notes: string | null;
  created_at: string;
  download_kbps: number | null;
  upload_kbps: number | null;
  session_timeout_minutes: number | null;
  idle_timeout_minutes: number | null;
  data_limit_mb: number | null;
  sync_status: string;
  last_synced_at: string | null;
};

const ROLE_PRESETS = ["Manager", "Waiter", "Cleaner", "Receptionist", "Chef", "Security", "Family", "Other"];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10) || "staff";
}
function rand(n: number) {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function genUsername(name: string) {
  return `staff-${slugify(name)}-${rand(4)}`;
}
function genPassword() {
  return rand(10);
}

export default function StaffAccess() {
  const { businessId, user, hasRole } = useAuth();
  const canDelete = hasRole("business_owner") || hasRole("super_admin");
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [routers, setRouters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const emptyForm = {
    staff_name: "", role_label: "", phone: "", mac_address: "", notes: "",
    username: "", password: "", router_id: "none", package_id: "none",
    download_kbps: "", upload_kbps: "",
    session_timeout_minutes: "", idle_timeout_minutes: "", data_limit_mb: "",
  };
  const [f, setF] = useState(emptyForm);

  async function load() {
    if (!businessId) return;
    setLoading(true);
    const [{ data: staff }, { data: pkgs }, { data: rts }] = await Promise.all([
      supabase.from("staff_wifi_access").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("packages").select("id,name,active").eq("business_id", businessId).eq("active", true),
      supabase.from("routers").select("id,name").eq("business_id", businessId),
    ]);
    setRows((staff as StaffRow[]) ?? []);
    setPackages(pkgs ?? []);
    setRouters(rts ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [businessId]);

  function openCreate() {
    setEditing(null);
    setF({ ...emptyForm, username: genUsername("staff"), password: genPassword() });
    setOpen(true);
  }
  function openEdit(row: StaffRow) {
    setEditing(row);
    setF({
      staff_name: row.staff_name,
      role_label: row.role_label ?? "",
      phone: row.phone ?? "",
      mac_address: row.mac_address ?? "",
      notes: row.notes ?? "",
      username: row.username,
      password: row.password,
      router_id: row.router_id ?? "none",
      package_id: row.package_id ?? "none",
      download_kbps: row.download_kbps?.toString() ?? "",
      upload_kbps: row.upload_kbps?.toString() ?? "",
      session_timeout_minutes: row.session_timeout_minutes?.toString() ?? "",
      idle_timeout_minutes: row.idle_timeout_minutes?.toString() ?? "",
      data_limit_mb: row.data_limit_mb?.toString() ?? "",
    });
    setOpen(true);
  }

  function numOrNull(v: string): number | null {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    if (!f.staff_name.trim()) { toast.error("Staff name is required"); return; }
    if (!f.username.trim() || !f.password.trim()) { toast.error("Username and password are required"); return; }

    const payload = {
      business_id: businessId,
      staff_name: f.staff_name.trim(),
      role_label: f.role_label || null,
      phone: f.phone || null,
      mac_address: f.mac_address || null,
      notes: f.notes || null,
      username: f.username.trim(),
      password: f.password,
      router_id: f.router_id === "none" ? null : f.router_id,
      package_id: f.package_id === "none" ? null : f.package_id,
      download_kbps: numOrNull(f.download_kbps),
      upload_kbps: numOrNull(f.upload_kbps),
      session_timeout_minutes: numOrNull(f.session_timeout_minutes),
      idle_timeout_minutes: numOrNull(f.idle_timeout_minutes),
      data_limit_mb: numOrNull(f.data_limit_mb),
      sync_status: "pending",
    };

    if (editing) {
      const { error } = await supabase.from("staff_wifi_access").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Staff access updated");
    } else {
      const { error } = await supabase.from("staff_wifi_access").insert({ ...payload, created_by: user?.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Staff access created");
    }
    setOpen(false);
    load();
  }

  async function toggleEnabled(row: StaffRow, enabled: boolean) {
    const { error } = await supabase.from("staff_wifi_access").update({ enabled }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, enabled } : x)));
    toast.success(enabled ? "Access enabled" : "Access disabled");
  }

  async function regenerate(row: StaffRow) {
    const newPwd = genPassword();
    const { error } = await supabase.from("staff_wifi_access").update({ password: newPwd }).eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, password: newPwd } : x)));
    setReveal((s) => ({ ...s, [row.id]: true }));
    toast.success("Password regenerated");
  }

  async function syncRow(row: StaffRow) {
    await supabase.from("staff_wifi_access").update({ sync_status: "syncing" }).eq("id", row.id);
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, sync_status: "syncing" } : x)));
    const res = await syncStaffToRouter(row.id);
    if (!res.ok) {
      await supabase.from("staff_wifi_access").update({ sync_status: "failed" }).eq("id", row.id);
      setRows((r) => r.map((x) => (x.id === row.id ? { ...x, sync_status: "failed" } : x)));
      toast.error(res.error ?? "Sync failed");
      return;
    }
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, sync_status: "synced", last_synced_at: new Date().toISOString() } : x)));
    toast.success(`Pushed limits to MikroTik (mock) — ${buildRateLimit(row) ?? "no rate limit"}`);
  }

  async function remove(row: StaffRow) {
    const { error } = await supabase.from("staff_wifi_access").delete().eq("id", row.id);
    if (error) { toast.error(error.message); return; }
    setRows((r) => r.filter((x) => x.id !== row.id));
    toast.success("Staff access removed");
  }

  function copyText(t: string, label = "Copied") {
    navigator.clipboard.writeText(t);
    toast.success(label);
  }

  async function printCard(row: StaffRow) {
    const doc = new jsPDF({ unit: "mm", format: [100, 150] });
    // Header band
    doc.setFillColor(15, 81, 50); // emerald
    doc.rect(0, 0, 100, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Staff WiFi Access", 50, 10, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Palm Connect", 50, 16, { align: "center" });

    // Body
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(row.staff_name, 50, 32, { align: "center" });
    if (row.role_label) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text(row.role_label, 50, 38, { align: "center" });
    }

    doc.setDrawColor(220, 220, 220);
    doc.line(10, 44, 90, 44);

    doc.setTextColor(110, 110, 110);
    doc.setFontSize(8);
    doc.text("USERNAME", 10, 52);
    doc.setTextColor(20, 20, 20);
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.text(row.username, 10, 58);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(110, 110, 110);
    doc.setFontSize(8);
    doc.text("PASSWORD", 10, 68);
    doc.setTextColor(20, 20, 20);
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.text(row.password, 10, 74);

    // QR (WIFI string – note SSID is unknown so we encode credentials as text fallback)
    try {
      const qrPayload = `Username: ${row.username}\nPassword: ${row.password}`;
      const qrUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 256 });
      doc.addImage(qrUrl, "PNG", 32, 84, 36, 36);
    } catch {}

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text("Do not share. One device per account.", 50, 130, { align: "center" });

    doc.save(`staff-wifi-${row.username}.pdf`);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Staff WiFi Access</h1>
            <p className="text-muted-foreground text-sm mt-1">Permanent WiFi credentials for your team. Toggle, regenerate, or revoke any time.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="bg-emerald-grad text-background hover:opacity-90">
                <Plus className="h-4 w-4 mr-2" /> Add Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Staff Access" : "New Staff Access"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Full Name *</Label>
                    <Input value={f.staff_name} onChange={(e) => setF({ ...f, staff_name: e.target.value })} placeholder="Mary Wanjiku" required />
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={f.role_label} onValueChange={(v) => setF({ ...f, role_label: v })}>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                      <SelectContent>
                        {ROLE_PRESETS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone</Label>
                    <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+254..." />
                  </div>
                  <div>
                    <Label>MAC Address (optional)</Label>
                    <Input value={f.mac_address} onChange={(e) => setF({ ...f, mac_address: e.target.value })} placeholder="AA:BB:CC:DD:EE:FF" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Router</Label>
                    <Select value={f.router_id} onValueChange={(v) => setF({ ...f, router_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Any router" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Any router</SelectItem>
                        {routers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Speed Package</Label>
                    <Select value={f.package_id} onValueChange={(v) => setF({ ...f, package_id: v })}>
                      <SelectTrigger><SelectValue placeholder="No limit" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No limit</SelectItem>
                        {packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Username</Label>
                    <div className="flex gap-2">
                      <Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} className="font-mono text-sm" />
                      <Button type="button" variant="outline" size="icon" onClick={() => setF({ ...f, username: genUsername(f.staff_name) })}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Password</Label>
                    <div className="flex gap-2">
                      <Input value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className="font-mono text-sm" />
                      <Button type="button" variant="outline" size="icon" onClick={() => setF({ ...f, password: genPassword() })}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Bandwidth & Session Limits</span>
                    <span className="text-xs text-muted-foreground">— pushed to MikroTik hotspot profile</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Download (kbps)</Label>
                      <Input type="number" min={0} value={f.download_kbps} onChange={(e) => setF({ ...f, download_kbps: e.target.value })} placeholder="e.g. 5000" />
                    </div>
                    <div>
                      <Label className="text-xs">Upload (kbps)</Label>
                      <Input type="number" min={0} value={f.upload_kbps} onChange={(e) => setF({ ...f, upload_kbps: e.target.value })} placeholder="e.g. 2000" />
                    </div>
                    <div>
                      <Label className="text-xs">Session timeout (min)</Label>
                      <Input type="number" min={0} value={f.session_timeout_minutes} onChange={(e) => setF({ ...f, session_timeout_minutes: e.target.value })} placeholder="Blank = unlimited" />
                    </div>
                    <div>
                      <Label className="text-xs">Idle timeout (min)</Label>
                      <Input type="number" min={0} value={f.idle_timeout_minutes} onChange={(e) => setF({ ...f, idle_timeout_minutes: e.target.value })} placeholder="e.g. 30" />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Data cap (MB / billing cycle)</Label>
                      <Input type="number" min={0} value={f.data_limit_mb} onChange={(e) => setF({ ...f, data_limit_mb: e.target.value })} placeholder="Blank = unlimited" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Optional internal notes" rows={2} />
                </div>

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-emerald-grad text-background">{editing ? "Save changes" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto bg-emerald-grad/10 p-4 rounded-full w-fit mb-4">
                <UserCog className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">No staff yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Create permanent WiFi credentials for your team members.</p>
              <Button onClick={openCreate} className="bg-emerald-grad text-background"><Plus className="h-4 w-4 mr-2" />Add first staff</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <div>{row.staff_name}</div>
                      {row.phone && <div className="text-xs text-muted-foreground">{row.phone}</div>}
                    </TableCell>
                    <TableCell><span className="text-sm text-muted-foreground">{row.role_label ?? "—"}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{row.username}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(row.username, "Username copied")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {reveal[row.id] ? row.password : "••••••••"}
                        </code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReveal((s) => ({ ...s, [row.id]: !s[row.id] }))}>
                          {reveal[row.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyText(row.password, "Password copied")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.mac_address ? (
                        <code className="text-xs">{row.mac_address}</code>
                      ) : (
                        <span className="text-xs text-muted-foreground">Any</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <div className="font-mono">
                          {buildRateLimit(row) ?? <span className="text-muted-foreground">No rate limit</span>}
                        </div>
                        <div className="text-muted-foreground">
                          {row.session_timeout_minutes ? `${row.session_timeout_minutes}m session` : "∞ session"}
                          {row.data_limit_mb ? ` · ${row.data_limit_mb}MB cap` : ""}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <Switch checked={row.enabled} onCheckedChange={(v) => toggleEnabled(row, v)} />
                          <Badge variant={row.enabled ? "default" : "secondary"} className={row.enabled ? "bg-emerald-grad text-background" : ""}>
                            {row.enabled ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-[10px]">
                          {row.sync_status === "synced" ? (
                            <><CheckCircle2 className="h-3 w-3 text-emerald-500" /><span className="text-muted-foreground">Synced</span></>
                          ) : row.sync_status === "syncing" ? (
                            <><RefreshCw className="h-3 w-3 animate-spin text-primary" /><span className="text-muted-foreground">Syncing…</span></>
                          ) : row.sync_status === "failed" ? (
                            <><AlertCircle className="h-3 w-3 text-destructive" /><span className="text-destructive">Sync failed</span></>
                          ) : (
                            <><AlertCircle className="h-3 w-3 text-amber-500" /><span className="text-amber-600">Pending sync</span></>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Sync to router" onClick={() => syncRow(row)} disabled={row.sync_status === "syncing"}>
                          <Wifi className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Print card" onClick={() => printCard(row)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Regenerate password" onClick={() => regenerate(row)}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Delete">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove {row.staff_name}'s access?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This permanently revokes their WiFi credentials. This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => remove(row)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
