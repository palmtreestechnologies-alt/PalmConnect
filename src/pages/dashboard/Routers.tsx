import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConnectRouterDialog } from "@/components/routers/ConnectRouterDialog";
import { RouterTelemetrySheet } from "@/components/routers/RouterTelemetrySheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Router as RouterIcon,
  Trash2,
  Wifi,
  WifiOff,
  MoreVertical,
  Eye,
  RefreshCw,
  Clock,
  Download,
  Sparkles,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type RouterRow = {
  id: string;
  name: string;
  host: string | null;
  api_port: number;
  connection_mode: string;
  hotspot_interface: string | null;
  model: string | null;
  status: string;
  last_seen_at: string | null;
};

type Filter = "all" | "online" | "offline";

export default function Routers() {
  const { businessId } = useAuth();
  const [routers, setRouters] = useState<RouterRow[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<RouterRow | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  async function load() {
    if (!businessId) return;
    const { data } = await supabase
      .from("routers")
      .select("id,name,host,api_port,connection_mode,hotspot_interface,model,status,last_seen_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setRouters((data as RouterRow[]) ?? []);
  }
  useEffect(() => {
    load();
  }, [businessId]);

  const counts = useMemo(
    () => ({
      all: routers.length,
      online: routers.filter((r) => r.status === "online").length,
      offline: routers.filter((r) => r.status !== "online").length,
    }),
    [routers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return routers
      .filter((r) =>
        filter === "all"
          ? true
          : filter === "online"
            ? r.status === "online"
            : r.status !== "online"
      )
      .filter(
        (r) =>
          !q || r.name.toLowerCase().includes(q) || (r.host ?? "").toLowerCase().includes(q)
      );
  }, [routers, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filter, search, pageSize]);

  async function remove(id: string) {
    if (!confirm("Delete this router?")) return;
    const { error } = await supabase.from("routers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      load();
    }
  }

  async function setStatus(id: string, status: "online" | "offline") {
    await supabase
      .from("routers")
      .update({
        status,
        last_seen_at: status === "online" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    load();
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">MikroTik Routers</h1>
            <p className="text-sm text-muted-foreground">
              Connect and monitor your hotspot routers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {counts.offline > 0 && (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="h-3 w-3" /> {counts.offline} offline
              </Badge>
            )}
            <Button variant="hero" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Connect a MikroTik
            </Button>
          </div>
          <ConnectRouterDialog open={open} onOpenChange={setOpen} onCreated={load} />
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <RouterIcon className="h-3.5 w-3.5" />
              All
              <Badge variant="secondary" className="h-5">
                {counts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="online" className="gap-2">
              <Wifi className="h-3.5 w-3.5" />
              Online
              <Badge className="h-5 bg-success text-background hover:bg-success">
                {counts.online}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="offline" className="gap-2">
              <WifiOff className="h-3.5 w-3.5" />
              Offline
              <Badge variant="destructive" className="h-5">
                {counts.offline}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {routers.length === 0 ? (
          <Card className="p-12 bg-card-grad text-center">
            <RouterIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-display font-semibold text-lg">No routers yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your MikroTik to start managing hotspot users.
            </p>
          </Card>
        ) : (
          <Card className="bg-card-grad overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or host…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{r.name}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {r.connection_mode === "agent" ? `${r.model ?? "MikroTik"} · ${r.hotspot_interface ?? ""}` : `${r.host}:${r.api_port}`}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.status === "online" ? "default" : "secondary"}
                          className={
                            r.status === "online" ? "bg-success text-background" : ""
                          }
                        >
                          {r.status === "online" ? (
                            <Wifi className="h-3 w-3 mr-1" />
                          ) : (
                            <WifiOff className="h-3 w-3 mr-1" />
                          )}
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.last_seen_at ? new Date(r.last_seen_at).toLocaleString() : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-secondary hover:text-secondary"
                            onClick={() =>
                              toast.info("AI router diagnostics — coming in Phase E.")
                            }
                          >
                            <Sparkles className="h-3.5 w-3.5 mr-1" /> Diagnose
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <MoreVertical className="h-3.5 w-3.5 mr-1" /> Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuItem
                                onClick={() => setSelected(r)}
                              >
                                <Eye className="h-4 w-4 mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setStatus(r.id, "online");
                                  toast.success("Reprovisioned (mock)");
                                }}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" /> Reprovision
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => toast.success("Hotspot files synced (mock)")}
                              >
                                <Download className="h-4 w-4 mr-2" /> Sync hotspot files
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toast.success("Router time synced (mock)")}
                              >
                                <Clock className="h-4 w-4 mr-2" /> Sync router time
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setStatus(
                                    r.id,
                                    r.status === "online" ? "offline" : "online"
                                  )
                                }
                              >
                                <Wifi className="h-4 w-4 mr-2" />
                                Mark {r.status === "online" ? "offline" : "online"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => remove(r.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paged.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No routers match your filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between p-3 border-t border-border text-xs text-muted-foreground gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span>Per page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span>
                  Page {currentPage} of {totalPages} · {filtered.length} router
                  {filtered.length === 1 ? "" : "s"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
      <RouterTelemetrySheet router={selected} onOpenChange={(v) => !v && setSelected(null)} />
    </DashboardLayout>
  );
}
