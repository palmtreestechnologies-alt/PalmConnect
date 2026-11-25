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
  const text = variant === "light" ? "text-white" : "text-foreground";
  const gold = variant === "light" ? "text-[#E4B24A]" : "text-[#B8841F]";
  return (
    <Link to={to} className={cn("flex items-center gap-2.5 group", className)}>
      <PalmMark className="h-10 w-10" />
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-display font-bold text-lg tracking-tight", text)}>
            Palm<span className={gold}>Connect</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-secondary font-semibold">
            Smart Wi-Fi. Better business.
          </span>
        </div>
      )}
      {!showWordmark && (
        <span className={cn("font-display font-bold text-lg tracking-tight", text)}>
          Palm<span className={gold}>Connect</span>
        </span>
      )}
    </Link>
  );
}
