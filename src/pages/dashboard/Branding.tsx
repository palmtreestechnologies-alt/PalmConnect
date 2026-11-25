import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PortalPreview } from "@/components/portal/PortalPreview";
import { BRANDING_EVENT } from "@/components/brand/BrandingProvider";
import { PalmMark } from "@/components/brand/PalmMark";
import { brandVars, contrast, HEX, PRESETS } from "@/lib/branding";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, RotateCcw, Save, Trash2, Upload, Wifi } from "lucide-react";

const DEFAULT = { primary: "#061650", accent: "#E4B24A" };
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

type State = { name: string; logo_url: string | null; primary: string | null; accent: string | null; welcome: string | null; language: string };

function ColorField({ id, label, value, fallback, onChange }: { id: string; label: string; value: string | null; fallback: string; onChange: (v: string | null) => void }) {
  const shown = value ?? fallback;
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <input id={id} type="color" aria-label={label} value={shown} onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1" />
        <Input value={text} maxLength={7} aria-label={`${label} hex code`} onChange={(e) => {
          const v = e.target.value.trim();
          setText(v);
          if (HEX.test(v)) onChange(v.toUpperCase());
        }} />
      </div>
      {!HEX.test(text) && <p className="text-xs text-destructive">Use a code like #061650.</p>}
    </div>
  );
}

export default function Branding() {
  const { businessId } = useAuth();
  const [s, setS] = useState<State | null>(null);
  const [saved, setSaved] = useState<State | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!businessId) return;
    supabase.from("businesses").select("name, logo_url, primary_color, accent_color, welcome_message, captive_portal_language")
      .eq("id", businessId).maybeSingle().then(({ data }) => {
        if (!data) return;
        const v: State = {
          name: data.name, logo_url: data.logo_url,
          primary: data.primary_color && HEX.test(data.primary_color) ? data.primary_color : null,
          accent: data.accent_color && HEX.test(data.accent_color) ? data.accent_color : null,
          welcome: data.welcome_message, language: data.captive_portal_language,
        };
        setS(v); setSaved(v);
      });
  }, [businessId]);

  const vars = useMemo(() => (s ? brandVars({ primary: s.primary, accent: s.accent }, false) : {}), [s]);
  const dirty = !!s && !!saved && (s.primary !== saved.primary || s.accent !== saved.accent || s.logo_url !== saved.logo_url);
  const warn = s?.accent && contrast(s.accent, "#FFFFFF") < 1.6 ? "That accent is very light and may be hard to see on white." : "";

  async function save(next: State = s!) {
    if (!businessId) return;
    setSaving(true);
    const { error } = await supabase.from("businesses")
      .update({ logo_url: next.logo_url, primary_color: next.primary, accent_color: next.accent }).eq("id", businessId);
    setSaving(false);
    if (error) return toast.error(error.message.includes("row-level") ? "Only the business owner can change branding." : error.message);
    setSaved(next);
    window.dispatchEvent(new Event(BRANDING_EVENT));
    toast.success("Branding saved");
  }

  async function upload(f: File) {
    if (!businessId || !s) return;
    const ext = TYPES[f.type];
    if (!ext) return toast.error("Use a PNG, JPG or WebP image.");
    if (f.size > 1024 * 1024) return toast.error("The logo must be under 1 MB.");
    setUploading(true);
    const path = `${businessId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("business-logos").upload(path, f, { contentType: f.type });
    if (error) { setUploading(false); return toast.error("Could not upload the logo. Please try again."); }
    const url = supabase.storage.from("business-logos").getPublicUrl(path).data.publicUrl;
    const old = s.logo_url?.split("/business-logos/")[1];
    setUploading(false);
    await save({ ...s, logo_url: url });
    if (old) supabase.storage.from("business-logos").remove([old]);
  }

  async function removeLogo() {
    if (!s) return;
    const old = s.logo_url?.split("/business-logos/")[1];
    await save({ ...s, logo_url: null });
    if (old) supabase.storage.from("business-logos").remove([old]);
  }

  if (!s) {
    return <DashboardLayout><div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1100px] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Branding</h1>
            <p className="text-sm text-muted-foreground">Your logo and colors, used across your dashboard, guest login page and printed logins.</p>
          </div>
          <Button variant="hero" onClick={() => save()} disabled={saving || !dirty}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save branding
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <Card className="space-y-4 bg-card-grad p-5">
              <h2 className="font-semibold">Logo</h2>
              <div className="flex items-center gap-4">
                <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-lg border bg-muted">
                  {s.logo_url ? <img src={s.logo_url} alt={`${s.name} logo`} className="h-full w-full object-contain" /> : <PalmMark className="h-14 w-14" />}
                </div>
                <div className="space-y-2">
                  <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => file.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {s.logo_url ? "Replace logo" : "Upload logo"}
                    </Button>
                    {s.logo_url && <Button variant="ghost" onClick={removeLogo}><Trash2 className="h-4 w-4" /> Remove</Button>}
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG or WebP, up to 1 MB. A square image on a transparent background looks best.</p>
                </div>
              </div>
            </Card>

            <Card className="space-y-4 bg-card-grad p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Colors</h2>
                <Button variant="ghost" size="sm" onClick={() => setS({ ...s, primary: null, accent: null })} disabled={!s.primary && !s.accent}>
                  <RotateCcw className="h-4 w-4" /> Use Palm Connect colors
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField id="b-primary" label="Main color" value={s.primary} fallback={DEFAULT.primary} onChange={(v) => setS({ ...s, primary: v })} />
                <ColorField id="b-accent" label="Accent color" value={s.accent} fallback={DEFAULT.accent} onChange={(v) => setS({ ...s, accent: v })} />
              </div>
              {warn && <p className="text-sm text-warning">{warn}</p>}
              <div>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Quick starts</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button key={p.name} type="button" onClick={() => setS({ ...s, primary: p.primary, accent: p.accent })}
                      className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:bg-muted">
                      <span className="flex"><span className="h-4 w-4 rounded-full border" style={{ background: p.primary }} /><span className="-ml-1.5 h-4 w-4 rounded-full border" style={{ background: p.accent }} /></span>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="space-y-3 bg-card-grad p-5">
              <h2 className="font-semibold">Your dashboard</h2>
              <div style={vars as React.CSSProperties} className="overflow-hidden rounded-xl border">
                <div className="flex">
                  <div className="w-36 space-y-3 p-3" style={{ background: "hsl(var(--sidebar-background))" }}>
                    <div className="flex items-center gap-2">
                      {s.logo_url ? <img src={s.logo_url} alt="" className="h-7 w-7 rounded object-contain" /> : <PalmMark className="h-7 w-7" />}
                      <span className="truncate text-xs font-semibold" style={{ color: "hsl(var(--sidebar-foreground))" }}>{s.name}</span>
                    </div>
                    <div className="rounded-md px-2 py-1.5 text-xs font-medium" style={{ background: "hsl(var(--sidebar-primary))", color: "hsl(var(--sidebar-primary-foreground))" }}>Vouchers</div>
                    <div className="px-2 text-xs" style={{ color: "hsl(var(--sidebar-foreground) / .7)" }}>Routers</div>
                  </div>
                  <div className="flex-1 space-y-3 bg-background p-4">
                    <p className="font-display font-semibold text-foreground">Register guest</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md px-3 py-1.5 text-sm font-semibold" style={{ background: "var(--gradient-gold)", color: "hsl(var(--secondary-foreground))" }}>Create login</span>
                      <span className="rounded-md px-3 py-1.5 text-sm font-medium" style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}>Save</span>
                      <Badge style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}>Online</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="h-fit bg-card-grad p-5 lg:sticky lg:top-6">
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Wifi className="h-3.5 w-3.5" /> Guest login page</div>
            <PortalPreview template="voucher-first" primaryColor={s.primary ?? DEFAULT.primary} logoUrl={s.logo_url}
              businessName={s.name} welcomeMessage={s.welcome} language={s.language} />
            <p className="mt-3 text-xs text-muted-foreground">This is how guests will see your brand when the login page is installed on your router.</p>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
