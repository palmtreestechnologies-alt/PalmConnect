import { cn } from "@/lib/utils";

type Status = "success" | "warning" | "danger" | "info" | "neutral";

const styles: Record<Status, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-destructive/15 text-destructive border-destructive/30",
  info: "bg-secondary/15 text-secondary border-secondary/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status = "neutral", children, className }: {
  status?: Status;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border", styles[status], className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full",
        status === "success" && "bg-success",
        status === "warning" && "bg-warning",
        status === "danger" && "bg-destructive",
        status === "info" && "bg-secondary",
        status === "neutral" && "bg-muted-foreground",
      )} />
      {children}
    </span>
  );
}
