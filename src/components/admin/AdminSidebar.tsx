import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Bike, Package, Car, MapPin, UtensilsCrossed, ShoppingCart,
  Home, Wallet, Zap, Gift, Trophy, Bell, Headphones, Settings, Shield, BarChart3,
  ChevronDown, ChevronLeft, ChevronRight, LogOut, Moon, Sun, Map, Smartphone,
} from "lucide-react";

const navGroups = [
  {
    label: "OVERVIEW",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
    ]
  },
  {
    label: "USERS",
    items: [
      { icon: Users, label: "All Users", path: "/admin/users" },
      { icon: Bike, label: "Rider Profiles", path: "/admin/riders" },
      { icon: Package, label: "Parcel Agents", path: "/admin/parcel-agents" },
    ]
  },
  {
    label: "RIDE MODULE",
    items: [
      { icon: Car, label: "Ride Bookings", path: "/admin/rides" },
      { icon: MapPin, label: "Tour Bookings", path: "/admin/rides/tours" },
      { icon: Car, label: "Scheduled Rides", path: "/admin/rides/scheduled" },
      { icon: Car, label: "Recurring Rides", path: "/admin/rides/recurring" },
      { icon: Settings, label: "Dispatch Config", path: "/admin/rides/dispatch" },
      { icon: Zap, label: "Bargain Offers", path: "/admin/rides/bargains" },
    ]
  },
  {
    label: "PARCEL MODULE",
    items: [
      { icon: Package, label: "Parcel Bookings", path: "/admin/parcels" },
    ]
  },
  {
    label: "FOOD MODULE",
    items: [
      { icon: UtensilsCrossed, label: "Restaurants", path: "/admin/food/restaurants" },
      { icon: UtensilsCrossed, label: "Menu Items", path: "/admin/food/menu" },
      { icon: UtensilsCrossed, label: "Food Orders", path: "/admin/food/orders" },
    ]
  },
  {
    label: "ECOMMERCE",
    items: [
      { icon: ShoppingCart, label: "Vendors", path: "/admin/ecommerce/vendors" },
      { icon: ShoppingCart, label: "Products", path: "/admin/ecommerce/products" },
      { icon: ShoppingCart, label: "Categories", path: "/admin/ecommerce/categories" },
      { icon: ShoppingCart, label: "Orders", path: "/admin/ecommerce/orders" },
    ]
  },
  {
    label: "ROOM RENT",
    items: [
      { icon: Home, label: "Room Listings", path: "/admin/rooms/listings" },
      { icon: Home, label: "Owners", path: "/admin/rooms/owners" },
      { icon: Home, label: "Inquiries", path: "/admin/rooms/inquiries" },
      { icon: Home, label: "Booking Requests", path: "/admin/rooms/requests" },
    ]
  },
  {
    label: "FINANCE",
    items: [
      { icon: Wallet, label: "Wallets", path: "/admin/finance/wallets" },
      { icon: Wallet, label: "Transactions", path: "/admin/finance/wallet-transactions" },
      { icon: Wallet, label: "Payments", path: "/admin/finance/payments" },
      { icon: Wallet, label: "Payment Intents", path: "/admin/finance/intents" },
      { icon: Wallet, label: "QR Sessions", path: "/admin/finance/qr-sessions" },
      { icon: Wallet, label: "Topup Requests", path: "/admin/finance/topups" },
      { icon: Wallet, label: "Rider Payouts", path: "/admin/finance/payouts" },
    ]
  },
  {
    label: "PRICING",
    items: [
      { icon: Zap, label: "Vehicle Types", path: "/admin/pricing/vehicles" },
      { icon: Zap, label: "Surge Rules", path: "/admin/pricing/surge" },
      { icon: Zap, label: "Fare Overrides", path: "/admin/pricing/overrides" },
      { icon: Zap, label: "Fare Estimates", path: "/admin/pricing/estimates" },
      { icon: Zap, label: "Coin Rate", path: "/admin/pricing/coins" },
    ]
  },
  {
    label: "PROMOTIONS",
    items: [
      { icon: Gift, label: "Promo Codes", path: "/admin/promotions/codes" },
      { icon: Gift, label: "Promo Usage", path: "/admin/promotions/usage" },
      { icon: Gift, label: "Birthday Promos", path: "/admin/promotions/birthday" },
      { icon: Gift, label: "Referral Rewards", path: "/admin/promotions/referrals" },
      { icon: Gift, label: "Popup Ads", path: "/admin/promotions/popup-ads" },
    ]
  },
  {
    label: "LOYALTY",
    items: [
      { icon: Trophy, label: "Tiers", path: "/admin/loyalty/tiers" },
      { icon: Trophy, label: "User Profiles", path: "/admin/loyalty/users" },
      { icon: Trophy, label: "Transactions", path: "/admin/loyalty/transactions" },
      { icon: Trophy, label: "Streaks", path: "/admin/loyalty/streaks" },
      { icon: Trophy, label: "Achievements", path: "/admin/loyalty/achievements" },
      { icon: Trophy, label: "Trip Targets", path: "/admin/loyalty/targets" },
      { icon: Trophy, label: "Demand Forecast", path: "/admin/loyalty/demand" },
    ]
  },
  {
    label: "NOTIFICATIONS",
    items: [
      { icon: Bell, label: "Send Push", path: "/admin/notifications/send" },
      { icon: Bell, label: "Templates", path: "/admin/notifications/templates" },
      { icon: Bell, label: "Push Logs", path: "/admin/notifications/logs" },
      { icon: Bell, label: "Inbox", path: "/admin/notifications/inbox" },
    ]
  },
  {
    label: "SUPPORT",
    items: [
      { icon: Headphones, label: "Support Tickets", path: "/admin/support" },
    ]
  },
  {
    label: "SETTINGS",
    items: [
      { icon: Settings, label: "App Settings", path: "/admin/settings/app" },
      { icon: Smartphone, label: "App Version", path: "/admin/settings/app-version" },
      { icon: Settings, label: "Service Charges", path: "/admin/settings/service-charges" },
      { icon: Settings, label: "App Versions", path: "/admin/settings/versions" },
      { icon: Settings, label: "Quick Replies", path: "/admin/settings/quick-replies" },
      { icon: Settings, label: "Cancellation", path: "/admin/settings/cancellation" },
    ]
  },
  {
    label: "ADMIN USERS",
    items: [
      { icon: Shield, label: "Admins", path: "/admin/admin-users" },
      { icon: Shield, label: "Activity Logs", path: "/admin/admin-users/activity" },
    ]
  },
  {
    label: "REPORTS",
    items: [
      { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
    ]
  },
];

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(navGroups.map(g => g.label)));

  const toggleGroup = (label: string) => {
    const next = new Set(expandedGroups);
    if (next.has(label)) next.delete(label); else next.add(label);
    setExpandedGroups(next);
  };

  return (
    <aside className={cn(
      "fixed top-0 left-0 h-screen glass-sidebar z-30 flex flex-col transition-all duration-300 border-r border-sidebar-border",
      collapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div
          className="h-9 w-9 shrink-0 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-white/15"
          aria-hidden
        >
          <Car className="h-4 w-4" strokeWidth={2.25} />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[15px] font-bold tracking-tight bg-gradient-to-r from-sidebar-foreground via-violet-light to-emerald-light bg-clip-text text-transparent">
                RideShare
              </span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/15 border border-primary/35 px-1.5 py-px rounded-md">
                Admin
              </span>
            </div>
            <span className="text-[10px] font-medium text-sidebar-foreground/45 tracking-wide">
              Operations console
            </span>
          </div>
        )}
      </div>

      {/* Admin Profile */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-foreground">SA</div>
            <div>
              <p className="text-xs font-medium text-sidebar-foreground">Super Admin</p>
              <p className="text-[10px] text-sidebar-foreground/60">superadmin</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        {navGroups.map(group => (
          <div key={group.label} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center justify-between w-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60"
              >
                {group.label}
                <ChevronDown className={cn("h-3 w-3 transition-transform", !expandedGroups.has(group.label) && "-rotate-90")} />
              </button>
            )}
            {(collapsed || expandedGroups.has(group.label)) && group.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-2.5 mx-2 px-2 py-1.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate text-xs">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        <button onClick={onToggle} className="flex items-center justify-center w-full p-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="text-xs ml-2">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
