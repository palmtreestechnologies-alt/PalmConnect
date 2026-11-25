import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  { id: "monochrome", name: "Monochrome", desc: "Clean, branded login form on a neutral background." },
  { id: "palm-hero", name: "Palm Hero", desc: "Logo + immersive emerald gradient — great for hotels & cafes." },
  { id: "voucher-first", name: "Voucher First", desc: "Big code input — perfect for paid voucher hotspots." },
];

export function TemplateGallery({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {TEMPLATES.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={cn(
              "text-left rounded-lg border-2 p-3 transition-all relative",
              active
                ? "border-secondary bg-secondary/5 shadow-card"
                : "border-border hover:border-secondary/40 hover:bg-muted/30"
            )}
          >
            {active && (
              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                <Check className="h-3 w-3" />
              </div>
            )}
            <Thumbnail id={t.id} />
            <div className="font-semibold text-sm mt-3">{t.name}</div>
            <div className="text-[11px] text-muted-foreground leading-snug">{t.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

function Thumbnail({ id }: { id: string }) {
  if (id === "palm-hero") {
    return (
      <div className="aspect-[3/2] rounded-md bg-gradient-to-br from-slate-900 via-emerald-900 to-emerald-600 relative overflow-hidden">
        <div className="absolute bottom-2 left-2 right-2 space-y-1">
          <div className="h-1.5 w-2/3 bg-white/40 rounded" />
          <div className="h-3 w-full bg-white/15 rounded" />
          <div className="h-3 w-full bg-white/15 rounded" />
          <div className="h-2.5 w-1/2 bg-secondary rounded" />
        </div>
      </div>
    );
  }
  if (id === "voucher-first") {
    return (
      <div className="aspect-[3/2] rounded-md bg-background border border-border relative overflow-hidden">
        <div className="h-3 bg-primary" />
        <div className="p-2 space-y-1.5">
          <div className="h-1 w-1/2 bg-muted-foreground/30 rounded mx-auto" />
          <div className="h-6 mt-1 border-2 border-dashed border-muted-foreground/30 rounded" />
          <div className="h-2.5 bg-secondary rounded" />
        </div>
      </div>
    );
  }
  return (
    <div className="aspect-[3/2] rounded-md bg-background border border-border p-2 space-y-1.5">
      <div className="h-1.5 w-1/3 bg-foreground/40 rounded" />
      <div className="h-1 w-1/2 bg-muted-foreground/30 rounded" />
      <div className="h-2 mt-2 bg-muted rounded" />
      <div className="h-2 bg-muted rounded" />
      <div className="h-2.5 bg-primary rounded" />
    </div>
  );
}
