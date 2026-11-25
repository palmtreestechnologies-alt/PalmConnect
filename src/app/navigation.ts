import {
  LayoutDashboard, Building2, Users, Network, BarChart3, CreditCard,
  Store, Sparkles, Bell, Download, Settings, LifeBuoy, Shield,
  Router, Ticket, Package, UserCog, Activity, Palette, Brush, ScrollText,
} from "lucide-react";
import type { ComponentType } from "react";

export type NavItem = {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
  children?: NavItem[];
  requiresRole?: "super_admin" | "business_owner" | "staff";
  badge?: string;
};

/**
 * Primary Palm Connect navigation (Master Prompt 01).
 * Existing feature pages are surfaced under Networking / Billing / Settings
 * so nothing breaks while modules are progressively rebuilt.
 */
export const primaryNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, end: true },
  {
    title: "Properties", url: "/dashboard/properties", icon: Building2,
  },
  {
    title: "Guests", url: "/dashboard/users", icon: Users,
    children: [
      { title: "Hotspot Users", url: "/dashboard/users", icon: Users },
      { title: "Active Sessions", url: "/dashboard/sessions", icon: Activity },
      { title: "Staff Access", url: "/dashboard/staff-access", icon: UserCog },
    ],
  },
  { title: "Routers", url: "/dashboard/routers", icon: Router },
  { title: "Branding", url: "/dashboard/branding", icon: Brush },
  { title: "Guest Login Page", url: "/dashboard/portal", icon: Palette },
  { title: "Network Check", url: "/dashboard/network-check", icon: Network },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  {
    title: "Billing", url: "/dashboard/billing", icon: CreditCard,
    children: [
      { title: "Subscription", url: "/dashboard/billing", icon: CreditCard },
      { title: "Vouchers", url: "/dashboard/vouchers", icon: Ticket },
    ],
  },
  { title: "Marketplace", url: "/dashboard/marketplace", icon: Store, badge: "Soon" },
  { title: "Palm AI", url: "/dashboard/ai", icon: Sparkles, badge: "Beta" },
  { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
  { title: "Downloads", url: "/dashboard/downloads", icon: Download },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
  { title: "Help Center", url: "/dashboard/help", icon: LifeBuoy },
];

export const adminNav: NavItem[] = [
  { title: "All Businesses", url: "/admin", icon: Shield, requiresRole: "super_admin" },
  { title: "Audit Logs", url: "/dashboard/logs", icon: ScrollText },
];
