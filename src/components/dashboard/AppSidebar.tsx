import { useState } from "react";
import { NavLink as RRNavLink, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { ChevronDown, Router as RouterIcon, Shield } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { primaryNav, adminNav, NavItem } from "@/app/navigation";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { hasRole } = useAuth();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const isActive = (url: string, end?: boolean) =>
    end ? location.pathname === url : location.pathname === url || location.pathname.startsWith(url + "/");

  const renderLeaf = (item: NavItem) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild>
        <RRNavLink
          to={item.url}
          end={item.end}
          className={({ isActive: active }) =>
            cn("flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
              active
                ? "bg-sidebar-accent text-secondary font-semibold"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <span className="text-sm flex-1 flex items-center justify-between">
              {item.title}
              {item.badge && (
                <span className="text-[9px] uppercase tracking-wider bg-secondary/20 text-secondary px-1.5 py-0.5 rounded">
                  {item.badge}
                </span>
              )}
            </span>
          )}
        </RRNavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderItem = (item: NavItem) => {
    if (!item.children?.length) return renderLeaf(item);
    const anyActive = item.children.some((c) => isActive(c.url, c.end)) || isActive(item.url);
    const open = openGroups[item.url] ?? anyActive;
    if (collapsed) return renderLeaf(item);
    return (
      <div key={item.url}>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setOpenGroups((s) => ({ ...s, [item.url]: !open }))}
            className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              anyActive ? "text-sidebar-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60")}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">{item.title}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </SidebarMenuButton>
        </SidebarMenuItem>
        {open && (
          <div className="ml-4 pl-3 border-l border-sidebar-border/50 mt-1 space-y-0.5">
            {item.children.map(renderLeaf)}
          </div>
        )}
      </div>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        <div className="px-4 py-5 border-b border-sidebar-border">
          {!collapsed ? <Logo variant="light" to="/dashboard" /> : (
            <div className="flex justify-center">
              <div className="bg-emerald-grad p-2 rounded-lg"><RouterIcon className="h-4 w-4 text-background" /></div>
            </div>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest px-3">
            Palm Cloud
          </SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>{primaryNav.map(renderItem)}</SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        {hasRole("super_admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-secondary uppercase text-[10px] tracking-widest px-3 flex items-center gap-1">
              <Shield className="h-3 w-3"/>Admin
            </SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>{adminNav.map(renderLeaf)}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
