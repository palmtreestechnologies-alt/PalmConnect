import { PageHeader, EmptyState } from "@/components/palm";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Store, Sparkles, Bell, Download, LifeBuoy } from "lucide-react";

function Stub({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <DashboardLayout>
      <PageHeader title={title} description={description} />
      <EmptyState icon={Icon} title="Coming soon" description="This module is part of the Palm Connect roadmap and will light up in an upcoming release." />
    </DashboardLayout>
  );
}

export const Marketplace = () => (
  <Stub icon={Store} title="Marketplace" description="Third-party integrations: PMS, payments, smart locks, messaging, and more." />
);
export const PalmAI = () => (
  <Stub icon={Sparkles} title="Palm AI" description="Your intelligent hospitality operations assistant." />
);
export const Notifications = () => (
  <Stub icon={Bell} title="Notifications" description="System alerts, plan updates, and router health notifications." />
);
export const Downloads = () => (
  <Stub icon={Download} title="Downloads" description="Palm Edge Gateway for Windows, macOS, Linux, Docker, and more." />
);
export const HelpCenter = () => (
  <Stub icon={LifeBuoy} title="Help Center" description="Guides, setup walkthroughs, and contact support." />
);
