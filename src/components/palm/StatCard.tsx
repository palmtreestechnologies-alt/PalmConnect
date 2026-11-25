import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label, value, icon: Icon, hint, trend, className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  className?: string;
}) {
  return (
    <Card className={cn("p-5 hover:shadow-card transition-shadow", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-semibold text-foreground mt-1 truncate">{value}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-secondary" />
          </div>
        )}
      </div>
      {trend && (
        <p className={cn("text-xs mt-3 font-medium", trend.positive ? "text-success" : "text-destructive")}>
          {trend.value}
        </p>
      )}
    </Card>
  );
}
