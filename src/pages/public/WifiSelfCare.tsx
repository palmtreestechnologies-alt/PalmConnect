import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, Loader2, CheckCircle2, AlertCircle, Clock, Database, Phone, Mail } from "lucide-react";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/voucher-status`;

type Result = {
  type: "voucher" | "user";
  status: string;
  package: string | null;
  data_limit_mb: number | null;
  expires_at: string | null;
  used_at?: string | null;
  remaining_ms: number | null;
  business: {
    name: string;
    logo_url: string | null;
    primary_color: string;
    redirect_url_after_purchase: string | null;
    support_phone: string | null;
    support_email: string | null;
  } | null;
};

function formatRemaining(ms: number | null) {
  if (ms == null) return "Unlimited";
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

export default function WifiSelfCare() {
  const { businessId } = useParams<{ businessId?: string }>();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("check");

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error === "not_found" ? "We couldn't find that voucher. Check the code and try again." : data.error || "Lookup failed");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const brand = result?.business?.primary_color ?? "#0F5132";
  const ok = result && result.status !== "expired" && result.status !== "disabled";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-emerald-950 to-emerald-900">
      <div className="w-full max-w-md space-y-4">
        <Card className="p-6 bg-card-grad shadow-elegant">
          <div className="flex items-center gap-3 mb-5">
            {result?.business?.logo_url ? (
              <img src={result.business.logo_url} alt="" className="h-10 w-10 object-contain rounded" />
            ) : (
              <div style={{ background: brand }} className="h-10 w-10 rounded-lg flex items-center justify-center text-white">
                <Wifi className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="font-display font-bold text-lg leading-tight">
                {result?.business?.name ?? "Wi-Fi Self-care"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {businessId ? "Buy a Wi-Fi voucher or check your status" : "Check your voucher status"}
              </p>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-1">
                            <TabsTrigger value="check">Check my Wi-Fi time</TabsTrigger>
            </TabsList>

            <TabsContent value="check" className="mt-4">
              <form onSubmit={check} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Voucher / username</Label>
                  <Input value={u} onChange={(e) => setU(e.target.value)} required autoComplete="off" />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input value={p} onChange={(e) => setP(e.target.value)} required autoComplete="off" />
                </div>
                <Button type="submit" className="w-full text-white" style={{ background: brand }} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Check status
                </Button>
              </form>

              {error && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <div className="mt-5 space-y-3 border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    {ok ? <CheckCircle2 className="h-5 w-5 text-success" /> : <AlertCircle className="h-5 w-5 text-warning" />}
                    <span className="font-semibold capitalize">{result.status}</span>
                    {result.package && <span className="text-sm text-muted-foreground">• {result.package}</span>}
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Time left</div>
                      <div className="font-display font-bold text-lg mt-0.5">{formatRemaining(result.remaining_ms)}</div>
                    </div>
                    <div className="bg-muted/40 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Database className="h-3 w-3" /> Data cap</div>
                      <div className="font-display font-bold text-lg mt-0.5">
                        {result.data_limit_mb ? `${(result.data_limit_mb / 1024).toFixed(1)} GB` : "Unlimited"}
                      </div>
                    </div>
                  </div>
                  {result.expires_at && (
                    <p className="text-xs text-muted-foreground">
                      Expires {new Date(result.expires_at).toLocaleString()}
                    </p>
                  )}
                  {result.business?.redirect_url_after_purchase && (
                    <Button asChild variant="outline" className="w-full">
                      <a href={result.business.redirect_url_after_purchase} target="_blank" rel="noopener noreferrer">
                        Top up / get more time
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        {result?.business && (result.business.support_phone || result.business.support_email) && (
          <Card className="p-4 bg-card-grad text-sm flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Need help?</div>
            {result.business.support_phone && (
              <a href={`tel:${result.business.support_phone}`} className="flex items-center gap-2 text-foreground">
                <Phone className="h-3.5 w-3.5 text-secondary" /> {result.business.support_phone}
              </a>
            )}
            {result.business.support_email && (
              <a href={`mailto:${result.business.support_email}`} className="flex items-center gap-2 text-foreground">
                <Mail className="h-3.5 w-3.5 text-secondary" /> {result.business.support_email}
              </a>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
