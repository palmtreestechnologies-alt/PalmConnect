import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Cpu,
  HardDrive,
  Users,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchRouterResource, parseUptimeSeconds } from "@/lib/routerOsClient";

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

type Telemetry = {
  uptime_seconds: number;
  cpu_load: number;
  memory_used_pct: number;
  active_users: number;
  firmware: string;
  reachable: boolean;
  source: "live" | "snapshot";
  recorded_at?: string;
  error_message?: string | null;
};

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

type Props = {
  router: RouterRow | null;
  onOpenChange: (v: boolean) => void;
};

export function RouterTelemetrySheet({ router, onOpenChange }: Props) {
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!router) {
      setTelemetry(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      // 1) Try live call
      // Agent routers cannot be reached from outside (NAT); they report in, so use the last snapshot.
      const live = router.connection_mode === "agent" ? null : await fetchRouterResource(router.id);
      if (cancelled) return;

      if (live) {
        const b = live.data;
        const memTotal = Number(b["total-memory"] ?? 0);
        const memFree = Number(b["free-memory"] ?? 0);
        const memUsedPct = memTotal > 0 ? Math.round(((memTotal - memFree) / memTotal) * 100) : 0;
        // Pull active user count from the latest snapshot (cheap) — avoids a 2nd round trip.
        const { data: snap } = await supabase
          .from("router_health")
          .select("active_users")
          .eq("router_id", router.id)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setTelemetry({
          uptime_seconds: parseUptimeSeconds(b.uptime ?? ""),
          cpu_load: Number(b["cpu-load"] ?? 0),
          memory_used_pct: memUsedPct,
          active_users: snap?.active_users ?? 0,
          firmware: b.version ?? "RouterOS",
          reachable: true,
          source: "live",
        });
      } else {
        // 2) Fallback to last persisted snapshot
        const { data: snap } = await supabase
          .from("router_health")
          .select("*")
          .eq("router_id", router.id)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        setTelemetry(
          snap
            ? {
                uptime_seconds: Number(snap.uptime_seconds ?? 0),
                cpu_load: snap.cpu_load ?? 0,
                memory_used_pct: snap.memory_used_pct ?? 0,
                active_users: snap.active_users ?? 0,
                firmware: snap.firmware ?? "RouterOS",
                reachable: snap.reachable,
                source: "snapshot",
                recorded_at: snap.recorded_at,
                error_message: snap.error_message,
              }
            : {
                uptime_seconds: 0,
                cpu_load: 0,
                memory_used_pct: 0,
                active_users: 0,
                firmware: "—",
                reachable: false,
                source: "snapshot",
                error_message: "No data yet — the poller hasn't run",
              },
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, tick]);

  // Refresh live data every 8s while open.
  useEffect(() => {
    if (!router) return;
    const i = setInterval(() => setTick((x) => x + 1), 8000);
    return () => clearInterval(i);
  }, [router]);

  const t = telemetry;
  const online = !!t?.reachable;
  const sourceLabel = useMemo(() => {
    if (!t) return "";
    if (t.source === "live") return "Live";
    if (t.recorded_at)
      return `Snapshot · ${new Date(t.recorded_at).toLocaleTimeString()}`;
    return "Snapshot";
  }, [t]);

  return (
    <Sheet open={!!router} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {router && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {router.name}
                <Badge
                  variant={online ? "default" : "secondary"}
                  className={online ? "bg-success text-background" : ""}
                >
                  {online ? (
                    <Wifi className="h-3 w-3 mr-1" />
                  ) : (
                    <WifiOff className="h-3 w-3 mr-1" />
                  )}
                  {online ? "online" : "offline"}
                </Badge>
                {t && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {sourceLabel}
                  </Badge>
                )}
              </SheetTitle>
              <SheetDescription className="font-mono text-xs">
                {router.connection_mode === "agent" ? `${router.model ?? "MikroTik"} · ${router.hotspot_interface ?? ""}` : `${router.host}:${router.api_port}`}
                {t?.firmware ? ` · ${t.firmware}` : ""}
              </SheetDescription>
            </SheetHeader>

            {!t ? (
              <div className="mt-8 text-sm text-muted-foreground">
                {loading ? "Reading router…" : "No telemetry available."}
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                {!online && t.error_message && (
                  <Card className="p-3 border-destructive/40 bg-destructive/5 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <div className="text-xs">
                      <div className="font-semibold">Router unreachable</div>
                      <div className="text-muted-foreground">{t.error_message}</div>
                    </div>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3 bg-card-grad">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" /> Uptime
                    </div>
                    <div className="font-display text-lg font-semibold mt-1">
                      {online ? fmtUptime(t.uptime_seconds) : "—"}
                    </div>
                  </Card>
                  <Card className="p-3 bg-card-grad">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> Active users
                    </div>
                    <div className="font-display text-lg font-semibold mt-1">
                      {online ? t.active_users : "—"}
                    </div>
                  </Card>
                </div>

                <Card className="p-4 bg-card-grad space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <Cpu className="h-3.5 w-3.5" /> CPU
                      </span>
                      <span className="font-mono">
                        {online ? `${t.cpu_load}%` : "—"}
                      </span>
                    </div>
                    <Progress value={online ? t.cpu_load : 0} className="h-2 mt-1" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <HardDrive className="h-3.5 w-3.5" /> Memory
                      </span>
                      <span className="font-mono">
                        {online ? `${t.memory_used_pct}%` : "—"}
                      </span>
                    </div>
                    <Progress
                      value={online ? t.memory_used_pct : 0}
                      className="h-2 mt-1"
                    />
                  </div>
                </Card>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Last seen:{" "}
                    {router.last_seen_at
                      ? new Date(router.last_seen_at).toLocaleString()
                      : "Never"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTick((x) => x + 1)}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                    />{" "}
                    Refresh
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
