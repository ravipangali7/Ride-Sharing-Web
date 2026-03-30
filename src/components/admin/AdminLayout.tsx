import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { cn } from "@/lib/utils";
import { getAccessToken } from "@/lib/api";

interface AdminLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export function AdminLayout({ children, fullWidth }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!getAccessToken()) {
      navigate("/admin/login", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      <div className="hidden md:block">
        <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card border-t flex items-center justify-around z-30 mobile-nav">
        {['Dashboard', 'Users', 'Rides', 'Finance', 'More'].map(label => (
          <button key={label} className="flex flex-col items-center gap-0.5 text-muted-foreground text-[10px]">
            <div className="h-5 w-5 bg-muted rounded" />
            {label}
          </button>
        ))}
      </div>

      <div className={cn(
        "transition-all duration-300",
        collapsed ? "md:ml-[72px]" : "md:ml-[260px]"
      )}>
        <AdminHeader />
        <main className={cn("p-4 md:p-6 pb-20 md:pb-6", fullWidth && "p-0 md:p-0")}>
          {children}
        </main>
      </div>
    </div>
  );
}
