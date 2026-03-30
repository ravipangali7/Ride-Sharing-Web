import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { UserSearchField } from "@/components/admin/UserSearchField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminResource, fetchAdminStats } from "@/lib/api";

interface RecurringData {
  id: string;
  customer: string;         // display name
  customer_id: string;      // FK UUID
  vehicle_type: string;     // display name
  vehicle_type_id: string;  // FK UUID
  pickup_address: string;
  drop_address: string;
  // UI helper — maps to recurrence_days on save
  schedule: string;
  recurrence_days: number[];
  pickup_time: string;
  payment_method: string;
  is_active: boolean;
  notes: string;
  created_at: string;
}

// Maps UI schedule preset to day-index arrays (0=Mon … 6=Sun)
const SCHEDULE_MAP: Record<string, number[]> = {
  daily:    [0, 1, 2, 3, 4, 5, 6],
  weekdays: [0, 1, 2, 3, 4],
  weekend:  [5, 6],
  custom:   [],
};

const emptyRecurring: Omit<RecurringData, "id" | "created_at"> = {
  customer: "", customer_id: "",
  vehicle_type: "", vehicle_type_id: "",
  pickup_address: "", drop_address: "",
  schedule: "daily", recurrence_days: [0, 1, 2, 3, 4, 5, 6],
  pickup_time: "07:00", payment_method: "cash",
  is_active: true, notes: "",
};

export default function RecurringRides() {
  const [items, setItems] = useState<RecurringData[]>([]);
  const { data } = useAdminResource<any>("recurring_rides", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "recurring_rides"],
    queryFn: () => fetchAdminStats("recurring_rides"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const { data: vehicleTypesData } = useQuery({
    queryKey: ["admin-resource", "vehicle_types"],
    queryFn: () => fetchAdminResource<any>("vehicle_types", { page_size: 100 }),
    staleTime: 60_000,
  });
  const vehicleTypes: { id: string; name: string }[] = vehicleTypesData?.results ?? [];

  const createMutation = useCreateResource("recurring_rides");
  const updateMutation = useUpdateResource("recurring_rides");
  const deleteMutation = useDeleteResource("recurring_rides");
  const [selected, setSelected] = useState<RecurringData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<RecurringData> & typeof emptyRecurring>(emptyRecurring);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RecurringData | null>(null);

  useEffect(() => {
    if (!data?.results) return;
    setItems(
      data.results.map((r: any) => {
        const days: number[] = Array.isArray(r.recurrence_days) ? r.recurrence_days : [];
        let schedule = "custom";
        if (days.length === 7) schedule = "daily";
        else if (days.length === 5 && days.every((d: number) => d < 5)) schedule = "weekdays";
        else if (days.length === 2 && days.includes(5) && days.includes(6)) schedule = "weekend";
        return {
          id: r.id,
          customer: r.customer_full_name || "",
          customer_id: r.customer || "",
          vehicle_type: r.vehicle_type_name || "",
          vehicle_type_id: r.vehicle_type || "",
          pickup_address: r.pickup_address || "",
          drop_address: r.drop_address || "",
          schedule,
          recurrence_days: days,
          pickup_time: r.pickup_time || "",
          payment_method: r.payment_method || "cash",
          is_active: Boolean(r.is_active),
          notes: r.notes || "",
          created_at: r.created_at ? String(r.created_at).slice(0, 10) : "",
        };
      })
    );
  }, [data?.results]);

  const handleCreate = () => {
    setEditing({ ...emptyRecurring, vehicle_type_id: vehicleTypes[0]?.id ?? "", vehicle_type: vehicleTypes[0]?.name ?? "" });
    setIsEditing(false);
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!editing.customer_id) { toast.error("Customer is required"); return; }
    if (!editing.pickup_address || !editing.drop_address) { toast.error("Pickup and drop address are required"); return; }
    if (!editing.vehicle_type_id) { toast.error("Vehicle type is required"); return; }
    const { customer, customer_id, vehicle_type, vehicle_type_id, schedule, created_at, ...rest } = editing as any;
    const payload: Record<string, any> = {
      ...rest,
      customer: customer_id,
      vehicle_type: vehicle_type_id,
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate({ id: (editing as any).id, data: payload }, { onSuccess: () => { toast.success("Template updated"); setFormOpen(false); } });
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Template created"); setFormOpen(false); } });
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, { onSuccess: () => {
        toast.success("Template deleted"); setDeleteOpen(false); setDeleteTarget(null);
        if (selected?.id === deleteTarget.id) { setDrawerOpen(false); setSelected(null); }
      }});
    }
  };

  return (
    <>
      <ModulePage title="Recurring Rides" subtitle="Manage recurring ride templates" createLabel="Create Template"
        onCreate={handleCreate} onRowClick={(r: RecurringData) => { setSelected(r); setDrawerOpen(true); }}
        stats={[
          { label: "Total Templates", value: statsData?.total ?? items.length },
          { label: "Active", value: statsData?.bool_counts.is_active ?? items.filter(i => i.is_active).length },
          { label: "Inactive", value: statsData ? (statsData.total - (statsData.bool_counts.is_active ?? 0)) : items.filter(i => !i.is_active).length },
          { label: "New Today", value: statsData?.today ?? 0 },
        ]}
        columns={[
          { key: "id", label: "ID", render: (r: RecurringData) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "customer", label: "Customer" },
          { key: "pickup_address", label: "Pickup" },
          { key: "drop_address", label: "Drop" },
          { key: "vehicle_type", label: "Vehicle" },
          { key: "schedule", label: "Schedule", render: (r: RecurringData) => <StatusBadge status={r.schedule === "daily" ? "active" : "pending"} /> },
          { key: "pickup_time", label: "Time" },
          { key: "is_active", label: "Active", render: (r: RecurringData) => <StatusBadge status={r.is_active ? "online" : "offline"} pulse={r.is_active} /> },
        ]} data={items} searchPlaceholder="Search template..."
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.id || ""} subtitle={selected?.customer}>
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing({ ...selected }); setIsEditing(true); setFormOpen(true); setDrawerOpen(false); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["Customer", selected.customer], ["Vehicle", selected.vehicle_type],
                ["Pickup", selected.pickup_address], ["Drop", selected.drop_address],
                ["Schedule", selected.schedule], ["Days", selected.recurrence_days.join(", ")],
                ["Time", selected.pickup_time], ["Payment", selected.payment_method],
                ["Active", selected.is_active ? "Yes" : "No"], ["Notes", selected.notes],
                ["Created", selected.created_at],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}><span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{k}</span><p className="text-sm font-medium">{v || "—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditing ? "Edit Template" : "Create Template"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <UserSearchField
              value={editing.customer_id}
              displayName={editing.customer}
              onChange={(id, name) => setEditing(p => ({ ...p, customer_id: id, customer: name }))}
              disabled={isEditing}
              label="Customer"
            />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Vehicle Type <span className="text-destructive">*</span></Label>
                <Select value={editing.vehicle_type_id} onValueChange={v => {
                  const vt = vehicleTypes.find(x => x.id === v);
                  setEditing(p => ({ ...p, vehicle_type_id: v, vehicle_type: vt?.name ?? "" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{vehicleTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-sm">Pickup Time</Label><Input type="time" value={editing.pickup_time} onChange={e => setEditing(p => ({ ...p, pickup_time: e.target.value }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-sm">Pickup Address *</Label><Input value={editing.pickup_address} onChange={e => setEditing(p => ({ ...p, pickup_address: e.target.value }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-sm">Drop Address *</Label><Input value={editing.drop_address} onChange={e => setEditing(p => ({ ...p, drop_address: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label className="text-sm">Schedule</Label>
                <Select value={editing.schedule} onValueChange={v => setEditing(p => ({ ...p, schedule: v, recurrence_days: SCHEDULE_MAP[v] ?? [] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekdays">Weekdays (Mon–Fri)</SelectItem>
                    <SelectItem value="weekend">Weekend (Sat–Sun)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Payment Method</Label>
                <Select value={editing.payment_method} onValueChange={v => setEditing(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="qr_esewa">eSewa QR</SelectItem>
                    <SelectItem value="qr_khalti">Khalti QR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2"><Label className="text-sm">Notes</Label><Input value={editing.notes} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} /></div>
              <div className="flex items-center justify-between p-3 rounded-lg border col-span-2"><Label>Active</Label><Switch checked={editing.is_active} onCheckedChange={v => setEditing(p => ({ ...p, is_active: v }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={handleSave}>{isEditing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Template" description={`Delete "${deleteTarget?.id}"?`} onConfirm={handleDelete} destructive />
    </>
  );
}
