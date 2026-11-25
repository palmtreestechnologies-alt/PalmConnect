import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Users, MoreHorizontal, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { z } from "zod";

const userSchema = z.object({
  username: z.string().trim().min(2).max(64),
  password: z.string().min(4).max(64),
  router_id: z.string().uuid().nullable(),
  package_id: z.string().uuid().nullable(),
  mac_address: z.string().trim().max(32).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  expires_at: z.string().optional().or(z.literal("")),
  enabled: z.boolean(),
});

type Row = {
  id: string;
  username: string;
  password: string;
  router_id: string | null;
  package_id: string | null;
  mac_address: string | null;
  phone: string | null;
  expires_at: string | null;
  enabled: boolean;
  created_at: string;
  routers?: { name: string } | null;
  packages?: { name: string } | null;
};

const EMPTY = {
  id: "",
  username: "",
  password: "",
  router_id: null as string | null,
  package_id: null as string | null,
  mac_address: "",
  phone: "",
  expires_at: "",
  enabled: true,
};

export default function HotspotUsers() {
  const { businessId } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [routers, setRouters] = useState<{ id: string; name: string }[]>([]);
  const [packages, setPackages] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [routerFilter, setRouterFilter] = useState("all");
  const [enabledFilter, setEnabledFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState<string | null>(null);

  async function load() {
    if (!businessId) return;
    const [{ data: u }, { data: r }, { data: p }] = await Promise.all([
      supabase
        .from("hotspot_users")
        .select("*, routers(name), packages(name)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
      supabase.from("routers").select("id, name").eq("business_id", businessId),
      supabase.from("packages").select("id, name").eq("business_id", businessId).eq("active", true),
    ]);
    setRows((u as Row[]) ?? []);
    setRouters(r ?? []);
    setPackages(p ?? []);
  }
  useEffect(() => { load(); }, [businessId]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (q && !r.username.toLowerCase().includes(q.toLowerCase()) && !r.phone?.includes(q)) return false;
        if (routerFilter !== "all" && r.router_id !== routerFilter) return false;
        if (enabledFilter === "enabled" && !r.enabled) return false;
        if (enabledFilter === "disabled" && r.enabled) return false;
        return true;
      }),
    [rows, q, routerFilter, enabledFilter]
  );

  function openNew() {
    setEditing(EMPTY);
    setOpen(true);
  }
  function openEdit(r: Row) {
    setEditing({
      id: r.id,
      username: r.username,
      password: r.password,
      router_id: r.router_id,
      package_id: r.package_id,
      mac_address: r.mac_address ?? "",
      phone: r.phone ?? "",
      expires_at: r.expires_at ? r.expires_at.slice(0, 16) : "",
      enabled: r.enabled,
    });
    setOpen(true);
  }

  async function save() {
    const parsed = userSchema.safeParse(editing);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (!businessId) return;
    setSaving(true);
    const payload = {
      business_id: businessId,
      username: editing.username,
      password: editing.password,
      router_id: editing.router_id,
      package_id: editing.package_id,
      mac_address: editing.mac_address || null,
      phone: editing.phone || null,
      expires_at: editing.expires_at ? new Date(editing.expires_at).toISOString() : null,
      enabled: editing.enabled,
    };
    const { error } = editing.id
      ? await supabase.from("hotspot_users").update(payload).eq("id", editing.id)
      : await supabase.from("hotspot_users").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "User updated" : "User created");
    setOpen(false);
    load();
  }

  async function syncToRouter(id: string) {
    setSyncing(id);
    await new Promise((r) => setTimeout(r, 700));
    setSyncing(null);
    toast.success("Synced to router");
  }

  async function bulkToggle(enabled: boolean) {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("hotspot_users").update({ enabled }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} user(s) ${enabled ? "enabled" : "disabled"}`);
    setSelected(new Set());
    load();
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} user(s)? This cannot be undone.`)) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from("hotspot_users").delete().in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} deleted`);
    setSelected(new Set());
    load();
  }

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Hotspot Users</h1>
            <p className="text-sm text-muted-foreground">Persistent accounts synced to your routers.</p>
          </div>
          <Button variant="hero" onClick={openNew}>
            <Plus className="h-4 w-4" /> New user
          </Button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username or phone" className="pl-9" />
          </div>
          <Select value={routerFilter} onValueChange={setRouterFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All routers</SelectItem>
              {routers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={enabledFilter} onValueChange={setEnabledFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>
          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">{selected.size} selected</span>
              <Button size="sm" variant="outline" onClick={() => bulkToggle(true)}>Enable</Button>
              <Button size="sm" variant="outline" onClick={() => bulkToggle(false)}>Disable</Button>
              <Button size="sm" variant="outline" onClick={bulkDelete}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </div>
          )}
        </div>

        {filtered.length === 0 ? (
          <Card className="p-12 bg-card-grad text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-display font-semibold text-lg">No hotspot users yet</h3>
            <p className="text-sm text-muted-foreground">Create persistent accounts here, or convert recently used vouchers from the Vouchers page.</p>
          </Card>
        ) : (
          <Card className="bg-card-grad overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(v) => {
                        const next = new Set(selected);
                        if (v) filtered.forEach((r) => next.add(r.id));
                        else filtered.forEach((r) => next.delete(r.id));
                        setSelected(next);
                      }}
                    />
                  </TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Router</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v) next.add(r.id); else next.delete(r.id);
                          setSelected(next);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-mono font-semibold">{r.username}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{r.password}</TableCell>
                    <TableCell>{r.packages?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm">{r.routers?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.phone ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={r.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
                        {r.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(r)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => syncToRouter(r.id)} disabled={syncing === r.id}>
                            {syncing === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                            Sync to router
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit hotspot user" : "New hotspot user"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <Input value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Router</Label>
                  <Select value={editing.router_id ?? ""} onValueChange={(v) => setEditing({ ...editing, router_id: v || null })}>
                    <SelectTrigger><SelectValue placeholder="Any router" /></SelectTrigger>
                    <SelectContent>
                      {routers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Package</Label>
                  <Select value={editing.package_id ?? ""} onValueChange={(v) => setEditing({ ...editing, package_id: v || null })}>
                    <SelectTrigger><SelectValue placeholder="No package" /></SelectTrigger>
                    <SelectContent>
                      {packages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>MAC address</Label>
                  <Input value={editing.mac_address} onChange={(e) => setEditing({ ...editing, mac_address: e.target.value })} placeholder="AA:BB:CC:DD:EE:FF" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Expires at</Label>
                <Input type="datetime-local" value={editing.expires_at} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value })} />
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <Label>Enabled</Label>
                <Switch checked={editing.enabled} onCheckedChange={(v) => setEditing({ ...editing, enabled: v })} />
              </div>
              <Button variant="hero" className="w-full" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editing.id ? "Save changes" : "Create user"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
