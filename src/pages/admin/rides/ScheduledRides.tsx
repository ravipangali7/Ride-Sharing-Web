import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatsBar } from "@/components/admin/StatsBar";
import { useAdminResource } from "@/hooks/useAdminResource";

export default function ScheduledRides() {
  const { data, isLoading } = useAdminResource<any>("scheduled_rides", { page_size: 200 });
  const rows = (data?.results || []).map((r: any, i: number) => ({
    id: r.id || `SR-${1000 + i}`,
    customer: r.ride_booking || "Unknown",
    scheduledAt: r.scheduled_datetime ? String(r.scheduled_datetime).slice(0, 19).replace("T", " ") : "",
    reminderSent: Boolean(r.reminder_sent),
    dispatchInitiated: Boolean(r.dispatch_initiated),
    status: r.status || "pending",
  }));
  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader title="Scheduled Rides" subtitle="Pre-booked rides" />
        <StatsBar stats={[
          { label: "Upcoming Today", value: rows.length }, { label: "Reminder Pending", value: rows.filter(r => !r.reminderSent).length }, { label: "Dispatch Pending", value: rows.filter(r => !r.dispatchInitiated).length },
        ]} className="!grid-cols-3" />
        {isLoading && <div className="text-sm text-muted-foreground py-4">Loading…</div>}
        {!isLoading && rows.length === 0 && <div className="text-sm text-muted-foreground py-4">No scheduled rides found.</div>}
        {rows.length > 0 && <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/30">
              {["Ride ID", "Customer", "Scheduled At", "Reminder", "Dispatch", "Status"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">{h}</th>)}
            </tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i} className="border-b hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                <td className="px-4 py-3">{r.customer}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.scheduledAt}</td>
                <td className="px-4 py-3">{r.reminderSent ? "✅" : "⏳"}</td>
                <td className="px-4 py-3">{r.dispatchInitiated ? "✅" : "⏳"}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${r.status === "assigned" ? "bg-emerald/10 text-emerald" : r.status === "cancelled" ? "bg-rose/10 text-rose" : "bg-amber/10 text-amber"}`}>{r.status}</span></td>
              </tr>
            ))}            </tbody>
          </table>
        </div>}
      </div>
    </AdminLayout>
  );
}
