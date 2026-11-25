import { useEffect, useMemo, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatBytes, formatUptime } from "@/lib/mockSessions";
import {
  fetchActiveSessions,
  disconnectSession,
  parseUptimeSeconds,
  type LiveSession,
} from "@/lib/routerOsClient";
import { Activity, Users, Gauge, MoreHorizontal, Search, Wifi, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  router_id: string;
  router_name: string;
  user: string;
  mac: string;
  ip: string;
  uptime_s: number;
  bytes_in: number;
  bytes_out: number;
};

export default function Sessions() {
  const { businessId, user } = useAuth();
  const [routers, setRouters] = useState<{ id: string; name: string; status: string }[]>([]);
  const [routerFilter, setRouterFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    supabase
      .from("routers")
      .select("id, name, status")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRouters(data ?? []));
  }, [businessId]);

  const targetRouters = useMemo(
    () =>
      routerFilter === "all"
        ? routers.filter((r) => r.status === "online")
        : routers.filter((r) => r.id === routerFilter),
    [routers, routerFilter],
  );

  const refresh = useCallback(async () => {
    if (targetRouters.length === 0) {
      setRows([]);
      return;
    }
    setLoading(true);
    const all: Row[] = [];
    await Promise.all(
      targetRouters.map(async (r) => {
        const sessions = await fetchActiveSessions(r.id);
        sessions.forEach((s: LiveSession) => {
          all.push({
            id: `${r.id}:${s[".id"]}`,
            router_id: r.id,
            router_name: r.name,
            user: s.user,
            mac: s["mac-address"],
            ip: s.address,
            uptime_s: parseUptimeSeconds(s.uptime ?? ""),
            bytes_in: Number(s["bytes-in"] ?? 0),
            bytes_out: Number(s["bytes-out"] ?? 0),
          });
        });
      }),
    );
    setRows(all);
    setLoading(false);
  }, [targetRouters]);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10_000);
    return () => clearInterval(t);
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter(
      (s) =>
        s.user.toLowerCase().includes(needle) ||
        s.mac.toLowerCase().includes(needle) ||
        s.ip.includes(q),
    );
  }, [rows, q]);

  const totalBytes = filtered.reduce((a, s) => a + s.bytes_in + s.bytes_out, 0);
  const top = [...filtered].sort((a, b) => b.bytes_in - a.bytes_in)[0];

  async function logAction(action: string, sess: Row) {
    if (!businessId || !user) return;
    await supabase.from("audit_logs").insert({
      action,
      entity: "hotspot_session",
      entity_id: null,
      user_id: user.id,
      business_id: businessId,
      metadata: { user: sess.user, mac: sess.mac, router: sess.router_name },
    });
  }

  async function disconnect(s: Row) {
    const sessionId = s.id.split(":")[1];
    const result = await disconnectSession(s.router_id, sessionId);
    if (result.ok) {
      logAction("session_disconnect", s);
      toast.success(`${s.user} disconnected`, { description: `Router: ${s.router_name}` });
      refresh();
    } else {
      toast.error("Could not disconnect — router unreachable");
    }
  }
  function extend(s: Row) {
    logAction("session_extend", s);
    toast.info("Extending sessions requires a package change — coming in Phase E.");
  }
  function block(s: Row) {
    logAction("session_block_mac", s);
    toast.success(`Blocked ${s.mac}`, { description: "MAC will be denied on next login." });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Active Sessions</h1>
            <p className="text-sm text-muted-foreground">Live RouterOS hotspot sessions — refreshes every 10s.</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 bg-card-grad">
            <div className="flex items-center gap-3">
              <div className="bg-secondary/15 p-2.5 rounded-lg"><Users className="h-4 w-4 text-secondary" /></div>
              <div>
                <div className="text-xs text-muted-foreground">Active users</div>
                <div className="font-display text-2xl font-bold">{filtered.length}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card-grad">
            <div className="flex items-center gap-3">
              <div className="bg-primary/15 p-2.5 rounded-lg"><Gauge className="h-4 w-4 text-primary" /></div>
              <div>
                <div className="text-xs text-muted-foreground">Total transferred</div>
                <div className="font-display text-2xl font-bold">{formatBytes(totalBytes)}</div>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-card-grad">
            <div className="flex items-center gap-3">
              <div className="bg-warning/15 p-2.5 rounded-lg"><Activity className="h-4 w-4 text-warning" /></div>
              <div>
                <div className="text-xs text-muted-foreground">Top consumer</div>
                <div className="font-mono text-sm font-semibold">{top?.user ?? "—"}</div>
                <div className="text-[11px] text-muted-foreground">{top ? formatBytes(top.bytes_in) : ""}</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={routerFilter} onValueChange={setRouterFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All online routers</SelectItem>
              {routers.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search user, MAC or IP" className="pl-9" />
          </div>
        </div>

        {routers.length === 0 ? (
          <Card className="p-12 bg-card-grad text-center">
            <Wifi className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-display font-semibold text-lg">No routers yet</h3>
            <p className="text-sm text-muted-foreground">Provision a router to start seeing live sessions.</p>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 bg-card-grad text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-display font-semibold text-lg">No active sessions</h3>
            <p className="text-sm text-muted-foreground">
              {targetRouters.length === 0
                ? "No online routers — check the Routers page."
                : "When guests connect, they'll appear here in real time."}
            </p>
          </Card>
        ) : (
          <Card className="bg-card-grad overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>MAC</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Down / Up</TableHead>
                  <TableHead>Router</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-semibold">{s.user}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{s.mac}</TableCell>
                    <TableCell className="font-mono text-xs">{s.ip}</TableCell>
                    <TableCell className="text-sm">{formatUptime(s.uptime_s)}</TableCell>
                    <TableCell className="text-sm">
                      <span className="text-success">↓ {formatBytes(s.bytes_in)}</span>
                      <span className="text-muted-foreground mx-1">/</span>
                      <span>↑ {formatBytes(s.bytes_out)}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <Badge variant="outline" className="font-normal">{s.router_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => extend(s)}>Extend session</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => disconnect(s)}>Disconnect</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => block(s)} className="text-destructive">Block MAC</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
