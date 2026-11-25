import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <DashboardLayout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
        <Card className="p-16 bg-card-grad text-center">
          <Construction className="h-12 w-12 mx-auto text-secondary mb-3"/>
          <h3 className="font-display font-semibold text-lg">Coming in the next iteration</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">This module is part of the next phase of Palm Connect. Tell the team what you'd like to see here first.</p>
        </Card>
      </div>
    </DashboardLayout>
  );
}

export const Analytics = () => <Placeholder title="Analytics" desc="Top devices, peak hours, returning customers."/>;
export const Logs = () => <Placeholder title="Audit Logs" desc="Track every admin action."/>;
export const SuperAdmin = () => <Placeholder title="All Businesses" desc="Super admin view across the platform."/>;
