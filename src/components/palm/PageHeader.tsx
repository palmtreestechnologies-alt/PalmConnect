import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  breadcrumbs?: ReactNode;
}

export function PageHeader({ title, description, actions, className, breadcrumbs }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 md:flex-row md:items-end md:justify-between pb-6 border-b border-border mb-6", className)}>
      <div className="min-w-0">
        {breadcrumbs && <div className="mb-2 text-xs text-muted-foreground">{breadcrumbs}</div>}
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground truncate">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
