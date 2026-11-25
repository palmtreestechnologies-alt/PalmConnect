import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PalmMark } from "@/components/brand/PalmMark";

export function Logo({
  className,
  to = "/",
  variant = "dark",
  showWordmark = false,
}: {
  className?: string;
  to?: string;
  variant?: "dark" | "light";
  showWordmark?: boolean;
}) {
  const text = variant === "light" ? "text-background" : "text-foreground";
  return (
    <Link to={to} className={cn("flex items-center gap-2.5 group", className)}>
      <PalmMark className="h-10 w-10" />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-display font-bold text-lg tracking-tight", text)}>
            PalmConnect
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-secondary font-semibold">
            Smart Wi-Fi
          </span>
        </div>
      )}
      {!showWordmark && (
        <span className={cn("font-display font-bold text-lg tracking-tight", text)}>
          PalmConnect
        </span>
      )}
    </Link>
  );
}
