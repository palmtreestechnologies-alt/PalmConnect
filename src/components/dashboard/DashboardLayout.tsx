import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LogOut,
  Bell,
  Shield,
  Settings as SettingsIcon,
  CreditCard,
  Users,
  ScrollText,
  Star,
  ShoppingCart,
  BookOpen,
  MessageCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { TrialBanner } from "@/components/TrialBanner";
import { ReadOnlyGuard } from "@/components/ReadOnlyGuard";

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { signOut, user, roles } = useAuth();
  const navigate = useNavigate();
  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();
  const roleLabel = roles[0]?.replace("_", " ") ?? "user";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden md:block">
                <p className="text-xs text-muted-foreground">Welcome back</p>
                <p className="text-sm font-semibold text-foreground capitalize">
                  {roleLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted hover:bg-muted/70 transition-colors">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-emerald-grad text-background text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-xs text-foreground max-w-[140px] truncate">
                      {user?.email}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium truncate">{user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{roleLabel}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/settings">
                      <SettingsIcon className="h-4 w-4 mr-2" /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                    <Shield className="h-4 w-4 mr-2" /> 2FA Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/billing")}>
                    <CreditCard className="h-4 w-4 mr-2" /> Billing & Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                    <Users className="h-4 w-4 mr-2" /> System users
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard/logs">
                      <ScrollText className="h-4 w-4 mr-2" /> System logs
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <Star className="h-4 w-4 mr-2" /> Refer a friend
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <ShoppingCart className="h-4 w-4 mr-2" /> Shop equipment
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <BookOpen className="h-4 w-4 mr-2" /> Documentation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <MessageCircle className="h-4 w-4 mr-2" /> Contact support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await signOut();
                      navigate("/");
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <TrialBanner />
          <ReadOnlyGuard />
          <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
}
