import { Link } from "react-router-dom";
import { AlertTriangle, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";

export function TrialBanner() {
  const { isTrialing, daysLeft, isReadOnly } = useSubscription();

  if (isReadOnly) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <Lock className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-sm font-medium text-destructive flex-1">
          Your free trial has ended. Account is in read-only mode — subscribe to resume operations.
        </span>
        <Button asChild size="sm" variant="hero"><Link to="/checkout">Subscribe now</Link></Button>
      </div>
    );
  }

  if (!isTrialing || daysLeft === null) return null;

  if (daysLeft <= 3) {
    return (
      <div className="bg-warning/10 border-b border-warning/30 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
        <span className="text-sm font-medium flex-1">
          Only {daysLeft} day{daysLeft === 1 ? "" : "s"} left in your free trial. Add payment to keep access.
        </span>
        <Button asChild size="sm" variant="hero"><Link to="/checkout">Add payment</Link></Button>
      </div>
    );
  }

  if (daysLeft <= 7) {
    return (
      <div className="bg-secondary/10 border-b border-secondary/30 px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <Clock className="h-4 w-4 text-secondary shrink-0" />
        <span className="text-sm flex-1">
          Your free trial ends in {daysLeft} days.
        </span>
        <Button asChild size="sm" variant="outline"><Link to="/checkout">Manage subscription</Link></Button>
      </div>
    );
  }

  return null;
}

export function TrialCountdownCard() {
  const { isTrialing, daysLeft, isPaid } = useSubscription();
  if (isPaid || !isTrialing || daysLeft === null) return null;
  const tone = daysLeft <= 3 ? "bg-warning/10 border-warning/30" : daysLeft <= 7 ? "bg-secondary/10 border-secondary/30" : "bg-emerald-grad text-background";
  return (
    <div className={`rounded-lg border p-4 flex items-center justify-between gap-4 ${tone}`}>
      <div>
        <p className="text-xs uppercase tracking-widest opacity-80">Free trial</p>
        <p className="font-display text-xl font-bold mt-0.5">
          {daysLeft === 0 ? "Ends today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`}
        </p>
      </div>
      <Button asChild size="sm" variant={daysLeft <= 3 ? "hero" : "gold"}><Link to="/checkout">Subscribe</Link></Button>
    </div>
  );
}
