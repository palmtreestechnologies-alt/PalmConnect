import { Wifi } from "lucide-react";

type Props = {
  template: string;
  primaryColor: string;
  logoUrl?: string | null;
  businessName: string;
  welcomeMessage?: string | null;
  language: string;
};

const LABELS: Record<string, { headline: string; sub: string; cta: string; user: string; pass: string; terms: string }> = {
  en: { headline: "Welcome", sub: "Connect to free Wi-Fi", cta: "Connect", user: "Voucher code", pass: "Password", terms: "By connecting you accept our terms." },
  sw: { headline: "Karibu", sub: "Unganisha kwenye Wi-Fi", cta: "Unganisha", user: "Nambari ya vocha", pass: "Nenosiri", terms: "Kwa kuunganisha unakubali masharti yetu." },
  fr: { headline: "Bienvenue", sub: "Connectez-vous au Wi-Fi", cta: "Se connecter", user: "Code voucher", pass: "Mot de passe", terms: "En vous connectant, vous acceptez nos conditions." },
};

export function PortalPreview({ template, primaryColor, logoUrl, businessName, welcomeMessage, language }: Props) {
  const t = LABELS[language] ?? LABELS.en;
  const headline = welcomeMessage || `${t.headline}, ${businessName}`;

  if (template === "palm-hero") {
    return (
      <div className="rounded-xl overflow-hidden border border-border shadow-card aspect-[9/16] max-w-[280px] mx-auto bg-gradient-to-br from-slate-900 via-emerald-900 to-emerald-700 text-white relative">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,white,transparent_60%)]" />
        <div className="relative h-full flex flex-col p-5">
          <div className="flex items-center gap-2">
            {logoUrl ? <img src={logoUrl} className="h-8 w-8 rounded object-contain bg-white/10 p-1" alt="" /> : <Wifi className="h-7 w-7" />}
            <span className="font-semibold text-sm">{businessName}</span>
          </div>
          <div className="mt-auto space-y-3">
            <h2 className="text-2xl font-bold leading-tight">{headline}</h2>
            <p className="text-xs opacity-80">{t.sub}</p>
            <div className="space-y-2 bg-black/30 backdrop-blur-sm rounded-lg p-3">
              <div className="text-[10px] opacity-70">{t.user}</div>
              <div className="h-7 rounded bg-white/15" />
              <div className="text-[10px] opacity-70">{t.pass}</div>
              <div className="h-7 rounded bg-white/15" />
              <button style={{ background: primaryColor }} className="w-full py-2 rounded text-xs font-semibold mt-1">{t.cta}</button>
            </div>
            <p className="text-[9px] opacity-60">{t.terms}</p>
          </div>
        </div>
      </div>
    );
  }

  if (template === "voucher-first") {
    return (
      <div className="rounded-xl overflow-hidden border border-border shadow-card aspect-[9/16] max-w-[280px] mx-auto bg-background">
        <div style={{ background: primaryColor }} className="p-4 text-white text-center">
          {logoUrl && <img src={logoUrl} className="h-10 w-10 mx-auto rounded bg-white/15 p-1.5 mb-2 object-contain" alt="" />}
          <div className="text-xs opacity-90">{businessName}</div>
        </div>
        <div className="p-5 flex flex-col h-full">
          <h2 className="text-lg font-bold text-center">{headline}</h2>
          <p className="text-[11px] text-muted-foreground text-center mt-1">{t.sub}</p>
          <div className="mt-6 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t.user}</div>
              <div className="h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground font-mono">XXXX-XXXX</div>
            </div>
            <button style={{ background: primaryColor }} className="w-full py-2.5 rounded-lg text-sm font-semibold text-white">{t.cta}</button>
          </div>
          <p className="text-[9px] text-muted-foreground text-center mt-auto">{t.terms}</p>
        </div>
      </div>
    );
  }

  // monochrome (default)
  return (
    <div className="rounded-xl overflow-hidden border border-border shadow-card aspect-[9/16] max-w-[280px] mx-auto bg-background">
      <div className="p-5 h-full flex flex-col">
        <div className="flex items-center gap-2">
          {logoUrl ? <img src={logoUrl} className="h-8 w-8 object-contain" alt="" /> : <div style={{ background: primaryColor }} className="h-8 w-8 rounded" />}
          <span className="font-semibold text-sm">{businessName}</span>
        </div>
        <div className="mt-8 space-y-1">
          <h2 className="text-xl font-bold">{headline}</h2>
          <p className="text-xs text-muted-foreground">{t.sub}</p>
        </div>
        <div className="mt-6 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t.user}</div>
            <div className="h-9 rounded border border-border" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t.pass}</div>
            <div className="h-9 rounded border border-border" />
          </div>
          <button style={{ background: primaryColor }} className="w-full py-2 rounded text-sm font-semibold text-white">{t.cta}</button>
        </div>
        <p className="text-[9px] text-muted-foreground text-center mt-auto">{t.terms}</p>
      </div>
    </div>
  );
}
