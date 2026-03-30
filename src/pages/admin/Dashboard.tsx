import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsBar } from "@/components/admin/StatsBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { motion } from "framer-motion";
import { Car, Package, Wallet, Users, Star, Headphones, Zap, Bell, ArrowRight } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardOverview,
  fetchDashboardActivity,
  fetchDashboardRevenueSeries,
  fetchDashboardTopPerformers,
} from "@/lib/api";

const PIE_COLORS = ["#4F46E5", "#F59E0B", "#F43F5E", "#10B981"];

export default function AdminDashboard() {
  const { data: overview } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: fetchDashboardOverview,
    refetchInterval: 30_000,
  });
  const { data: activity = [] } = useQuery({
    queryKey: ["dashboard-activity"],
    queryFn: fetchDashboardActivity,
    refetchInterval: 15_000,
  });
  const { data: revenueSeries = [] } = useQuery({
    queryKey: ["dashboard-revenue"],
    queryFn: fetchDashboardRevenueSeries,
    refetchInterval: 60_000,
  });
  const { data: performers } = useQuery({
    queryKey: ["dashboard-top-performers"],
    queryFn: fetchDashboardTopPerformers,
    refetchInterval: 60_000,
  });

  const kpis = overview?.kpis || {};
  const pendingActions: any[] = overview?.pending_actions || [];
  const moduleCounts = overview?.module_counts || { rides: 0, parcels: 0, food: 0, ecommerce: 0 };

  const total = Object.values(moduleCounts).reduce((s: number, v: any) => s + Number(v), 0) || 1;
  const pieData = [
    { name: "Ride", value: Math.round((Number(moduleCounts.rides) / total) * 100), color: PIE_COLORS[0] },
    { name: "Parcel", value: Math.round((Number(moduleCounts.parcels) / total) * 100), color: PIE_COLORS[1] },
    { name: "Food", value: Math.round((Number(moduleCounts.food) / total) * 100), color: PIE_COLORS[2] },
    { name: "Ecommerce", value: Math.round((Number(moduleCounts.ecommerce) / total) * 100), color: PIE_COLORS[3] },
  ];

  const topSections = [
    { title: "Top 5 Riders This Week", data: performers?.top_riders || [] },
    { title: "Top 5 Restaurants", data: performers?.top_restaurants || [] },
    { title: "Top 5 Vendors", data: performers?.top_vendors || [] },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back. Here's what's happening today.</p>
        </div>

        {/* KPI Row */}
        <StatsBar
          className="!grid-cols-2 sm:!grid-cols-4 lg:!grid-cols-4 xl:!grid-cols-8"
          stats={[
            { label: "Live Rides", value: kpis.live_rides ?? 0, pulse: true, icon: <Car className="h-4 w-4" />, trend: kpis.rides_completed_trend ?? undefined },
            { label: "Live Deliveries", value: kpis.live_deliveries ?? 0, pulse: true, icon: <Package className="h-4 w-4" /> },
            { label: "Revenue Today", value: `Rs. ${Number(kpis.revenue_today ?? 0).toLocaleString()}`, icon: <Wallet className="h-4 w-4" />, trend: kpis.revenue_trend ?? undefined },
            { label: "Active Users", value: kpis.active_users ?? 0, icon: <Users className="h-4 w-4" /> },
            { label: "Avg Rating", value: kpis.avg_rider_rating ?? 0, icon: <Star className="h-4 w-4" /> },
            { label: "Open Tickets", value: kpis.open_tickets ?? 0, icon: <Headphones className="h-4 w-4" /> },
            { label: "Surge Active", value: kpis.surge_active ?? 0, icon: <Zap className="h-4 w-4" /> },
            { label: "Push Sent", value: kpis.push_sent ?? 0, icon: <Bell className="h-4 w-4" /> },
          ]}
        />

        {/* Activity + Revenue */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Activity Feed */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-4">Live Activity Feed</h3>
            <div className="space-y-3 max-h-[340px] overflow-y-auto scrollbar-thin">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                activity.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-lg">{a.icon}</span>
                    <div className="flex-1">
                      <p>{a.text}</p>
                      <p className="text-xs text-muted-foreground">{a.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Revenue Chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-4">Revenue This Week</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip formatter={(v: number) => `Rs. ${Number(v).toLocaleString()}`} />
                <Bar dataKey="ride" fill="#4F46E5" radius={[4, 4, 0, 0]} name="Rides" />
                <Bar dataKey="parcel" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Parcels" />
                <Bar dataKey="food" fill="#F43F5E" radius={[4, 4, 0, 0]} name="Food" />
                <Bar dataKey="ecom" fill="#10B981" radius={[4, 4, 0, 0]} name="Ecommerce" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Orders Donut + Pending Actions */}
        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-4">Orders by Module</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {pieData.map(p => (
                <div key={p.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                  {p.name} ({p.value}%)
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="lg:col-span-2 rounded-xl border bg-card p-5">
            <h3 className="font-semibold mb-4">Pending Actions</h3>
            <div className="space-y-2">
              {pendingActions.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${a.priority === "high" ? "bg-rose-500" : a.priority === "medium" ? "bg-amber-500" : "bg-sky-500"}`} />
                    <span className="text-sm capitalize">{a.label}</span>
                    <span className="text-xs font-mono font-semibold bg-muted px-2 py-0.5 rounded-full">{a.count}</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Top Performers */}
        <div className="grid md:grid-cols-3 gap-6">
          {topSections.map((section, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }} className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold mb-4">{section.title}</h3>
              {section.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <div className="space-y-3">
                  {section.data.map((d, j) => (
                    <div key={j} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-5">#{j + 1}</span>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                        {d.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.metric}</p>
                      </div>
                      {d.extra && <span className="text-xs font-mono font-semibold">{d.extra}</span>}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
