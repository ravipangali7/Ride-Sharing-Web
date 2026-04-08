import { useEffect, useState, ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { AdminSidebar, adminNavGroups } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminErrorBoundary } from "./AdminErrorBoundary";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LayoutDashboard, Users, Car, Wallet, Menu } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

const mobileTabs = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Rides", path: "/admin/rides", icon: Car },
  { label: "Finance", path: "/admin/finance/wallets", icon: Wallet },
] as const;

function isMobileTabActive(tabPath: string, pathname: string): boolean {
  if (tabPath === "/admin/dashboard") return pathname === "/admin/dashboard";
  if (tabPath === "/admin/users") {
    return (
      pathname === "/admin/users" ||
      pathname.startsWith("/admin/riders") ||
      pathname.startsWith("/admin/parcel-agents")
    );
  }
  if (tabPath === "/admin/rides") return pathname.startsWith("/admin/rides");
  if (tabPath === "/admin/finance/wallets") return pathname.startsWith("/admin/finance");
  return pathname === tabPath || pathname.startsWith(`${tabPath}/`);
}

export function AdminLayout({ children, fullWidth }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!getAccessToken()) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate]);

  return (
    <AdminErrorBoundary>
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t flex items-center justify-around z-30 mobile-nav">
        {mobileTabs.map(({ label, path, icon: Icon }) => {
          const isActive = isMobileTabActive(path, location.pathname);
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[10px] min-w-0 flex-1 py-1 transition-colors",
                isActive ? "text-primary font-medium" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="truncate max-w-full px-0.5">{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] min-w-0 flex-1 py-1 transition-colors text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
          <SheetHeader className="text-left pb-2">
            <SheetTitle>All pages</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-4 pb-6">
            {adminNavGroups.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{group.label}</p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                        )
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className={cn("transition-all duration-300", collapsed ? "md:ml-[72px]" : "md:ml-[260px]")}>
        <AdminHeader />
        <main className={cn("p-4 md:p-6 pb-20 md:pb-6", fullWidth && "p-0 md:p-0")}>
          {children}
        </main>
      </div>
    </div>
    </AdminErrorBoundary>
  );
}
