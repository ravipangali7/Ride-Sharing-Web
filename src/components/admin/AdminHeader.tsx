import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Bell, Clock, Eye, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GodEyeMap } from "@/components/admin/GodEyeMap";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearTokens, fetchAdminResource, getAccessToken } from "@/lib/api";

interface NotifRow {
  id: string;
  title: string;
  body: string;
  is_read?: boolean;
  sent_at?: string;
}

export function AdminHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const [godEyeOpen, setGodEyeOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const handleLogout = () => {
    clearTokens();
    navigate("/admin/login", { replace: true });
  };

  const path = location.pathname.replace("/admin/", "").split("/").filter(Boolean);
  const breadcrumbs = path.map((p, i) => ({
    label: p.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    path: "/admin/" + path.slice(0, i + 1).join("/"),
  }));

  const token = getAccessToken();
  const { data: notifPreview } = useQuery({
    queryKey: ["admin-notif-inbox-preview"],
    queryFn: () => fetchAdminResource<NotifRow>("notif_inbox", { page: 1, page_size: 8 }),
    enabled: Boolean(token),
    staleTime: 45_000,
  });

  const previewRows = notifPreview?.results ?? [];
  const unreadPreview = previewRows.filter((r) => !r.is_read).length;

  const adminUserRaw = sessionStorage.getItem("admin_user") || localStorage.getItem("admin_user") || "{}";
  let initials = "SA";
  try {
    const u = JSON.parse(adminUserRaw) as { full_name?: string };
    initials = u.full_name?.slice(0, 2).toUpperCase() || "SA";
  } catch {
    /* keep */
  }

  return (
    <>
      <header className="h-16 border-b bg-card/80 backdrop-blur-sm flex items-center px-6 gap-4 sticky top-0 z-20">
        <nav className="flex items-center gap-1.5 text-sm min-w-0 flex-1 overflow-hidden">
          <Link to="/admin/dashboard" className="text-muted-foreground hover:text-foreground shrink-0">
            Admin
          </Link>
          {breadcrumbs.map((b, i) => (
            <span key={b.path} className="flex items-center gap-1.5 min-w-0">
              <span className="text-muted-foreground shrink-0">/</span>
              {i === breadcrumbs.length - 1 ? (
                <span className="font-medium truncate">{b.label}</span>
              ) : (
                <Link to={b.path} className="text-muted-foreground hover:text-foreground truncate">
                  {b.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <div className="relative ml-auto max-w-sm hidden md:block shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            readOnly
            placeholder="Search pages… (⌘K)"
            className="pl-9 h-9 w-64 bg-muted/50 rounded-lg cursor-pointer"
            onClick={() => setPaletteOpen(true)}
            onFocus={(e) => e.target.blur()}
          />
        </div>
        <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

        <div className="flex items-center gap-3 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setGodEyeOpen(true)}
                className="relative p-2 rounded-lg hover:bg-primary/10 transition-colors group"
              >
                <Eye className="h-4.5 w-4.5 text-primary group-hover:scale-110 transition-transform" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald rounded-full animate-pulse-dot border border-background" />
              </button>
            </TooltipTrigger>
            <TooltipContent>God Eye — map (live API)</TooltipContent>
          </Tooltip>
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadPreview > 0 ? (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-rose rounded-full" />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="font-semibold">User notifications (inbox)</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {previewRows.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground">No recent notifications.</div>
              ) : (
                previewRows.slice(0, 6).map((row) => (
                  <DropdownMenuItem key={row.id} className="flex flex-col items-start gap-0.5 py-2 cursor-default">
                    <span className="text-xs font-medium line-clamp-1">{row.title}</span>
                    <span className="text-[11px] text-muted-foreground line-clamp-2">{row.body}</span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/admin/notifications/inbox")}>
                Open full inbox
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground cursor-default">
            {initials}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
              >
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
