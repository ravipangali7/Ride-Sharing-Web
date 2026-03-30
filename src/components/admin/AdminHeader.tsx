import { useState } from "react";
import { Search, Bell, Clock, Eye, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation, useNavigate } from "react-router-dom";
import { GodEyeMap } from "@/components/admin/GodEyeMap";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { clearTokens } from "@/lib/api";

export function AdminHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [godEyeOpen, setGodEyeOpen] = useState(false);

  const handleLogout = () => {
    clearTokens();
    navigate("/admin/login", { replace: true });
  };
  const path = location.pathname.replace("/admin/", "").split("/");
  const breadcrumbs = path.map((p, i) => ({
    label: p.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
    path: "/admin/" + path.slice(0, i + 1).join("/"),
  }));

  return (
    <>
      <header className="h-16 border-b bg-card/80 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-20">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Admin</span>
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="text-muted-foreground">/</span>
              <span className={i === breadcrumbs.length - 1 ? "font-medium" : "text-muted-foreground"}>{b.label}</span>
            </span>
          ))}
        </nav>

        {/* Search */}
        <div className="relative ml-auto max-w-sm hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search... (⌘K)" className="pl-9 h-9 w-64 bg-muted/50 rounded-lg" />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setGodEyeOpen(true)}
                className="relative p-2 rounded-lg hover:bg-primary/10 transition-colors group"
              >
                <Eye className="h-4.5 w-4.5 text-primary group-hover:scale-110 transition-transform" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald rounded-full animate-pulse-dot border border-background" />
              </button>
            </TooltipTrigger>
            <TooltipContent>God Eye — Live Map</TooltipContent>
          </Tooltip>
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-rose rounded-full" />
          </button>
          <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground cursor-pointer">
            {(() => { try { return JSON.parse(sessionStorage.getItem("admin_user") || "{}").full_name?.slice(0,2).toUpperCase() || "SA"; } catch { return "SA"; } })()}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </header>
      <GodEyeMap open={godEyeOpen} onOpenChange={setGodEyeOpen} />
    </>
  );
}
