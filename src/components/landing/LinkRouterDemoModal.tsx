import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { steps } from "./HowItWorks";
import { ArrowLeft, ArrowRight, Pause, Play, RotateCcw, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function LinkRouterDemoModal({ open, onOpenChange }: Props) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const step = steps[i];
  const Icon = step.icon;
  const isLast = i === steps.length - 1;

  // reset when reopened
  useEffect(() => {
    if (open) {
      setI(0);
      setPlaying(true);
    }
  }, [open]);

  // autoplay
  useEffect(() => {
    if (!open || !playing) return;
    if (isLast) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setI((v) => Math.min(v + 1, steps.length - 1)), 3200);
    return () => clearTimeout(t);
  }, [i, playing, open, isLast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 bg-[hsl(210_60%_8%)] border-secondary/20 text-background overflow-hidden">
        <DialogTitle className="sr-only">Link your MikroTik router — interactive demo</DialogTitle>

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-background/10 bg-background/[0.03]">
          <div className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-md bg-emerald-grad grid place-items-center">
              <Icon className="h-3.5 w-3.5 text-background" />
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-secondary font-mono">
                Step {step.n} of {String(steps.length).padStart(2, "0")}
              </p>
              <p className="text-sm font-semibold text-background leading-tight">{step.title}</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 grid place-items-center rounded-md text-background/60 hover:text-background hover:bg-background/10 transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1 px-5 pt-3">
          {steps.map((s, idx) => (
            <button
              key={s.n}
              onClick={() => {
                setI(idx);
                setPlaying(false);
              }}
              className={cn(
                "flex-1 h-1 rounded-full transition-all",
                idx < i && "bg-secondary",
                idx === i && "bg-secondary/80",
                idx > i && "bg-background/10",
              )}
              aria-label={`Go to step ${s.n}`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="grid md:grid-cols-5 gap-6 p-5 sm:p-7">
          <div className="md:col-span-2">
            <p className="text-background/70 text-sm leading-relaxed">{step.desc}</p>
            {step.badge && (
              <span className="inline-flex items-center gap-1.5 mt-4 text-[10px] font-bold uppercase tracking-wider bg-secondary/15 text-secondary px-2.5 py-1 rounded-full">
                <Check className="h-3 w-3" /> {step.badge}
              </span>
            )}

            <ul className="mt-5 space-y-2 text-xs text-background/55">
              {steps.map((s, idx) => (
                <li
                  key={s.n}
                  className={cn(
                    "flex items-center gap-2 transition-colors",
                    idx === i && "text-background font-semibold",
                    idx < i && "text-secondary/80",
                  )}
                >
                  <span
                    className={cn(
                      "h-4 w-4 rounded-full grid place-items-center text-[9px] font-bold border",
                      idx < i && "bg-secondary border-secondary text-foreground",
                      idx === i && "border-secondary text-secondary",
                      idx > i && "border-background/20",
                    )}
                  >
                    {idx < i ? <Check className="h-2.5 w-2.5" /> : s.n.replace(/^0/, "")}
                  </span>
                  <span className="truncate">{s.title}</span>
                </li>
              ))}
            </ul>
          </div>

          <div key={i} className="md:col-span-3 animate-fade-in">
            <div className="rounded-xl border border-background/10 bg-background/[0.03] p-3 sm:p-4">
              {step.mock}
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-background/10 bg-background/[0.03]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setI(0);
                setPlaying(true);
              }}
              className="h-9 w-9 grid place-items-center rounded-md text-background/70 hover:text-background hover:bg-background/10 transition"
              aria-label="Restart"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-background/80 hover:text-background hover:bg-background/10 transition text-xs font-semibold"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? "Pause" : "Autoplay"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline-light"
              size="sm"
              disabled={i === 0}
              onClick={() => {
                setI((v) => Math.max(0, v - 1));
                setPlaying(false);
              }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            {isLast ? (
              <Button variant="hero" size="sm" onClick={() => onOpenChange(false)}>
                Done <Check className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                variant="hero"
                size="sm"
                onClick={() => {
                  setI((v) => Math.min(steps.length - 1, v + 1));
                  setPlaying(false);
                }}
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
