import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
import { UserSearchField } from "@/components/admin/UserSearchField";
import { EntitySearchField } from "@/components/admin/EntitySearchField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminResource, fetchAdminStats } from "@/lib/api";

interface TourData {
  id: string;
  customer: string;        // display name
  customer_id: string;     // FK UUID
  vehicle_type: string;    // display name
  vehicle_type_id: string; // FK UUID
  tour_type: string;
  pickup_address: string;
  destination_address: string;
  travel_date: string;
  assigned_rider: string;    // display name
  assigned_rider_id: string; // FK UUID (RiderProfile)
  quoted_fare: string;
  advance_amount: string;
  status: string;
  special_request: string;
  payment_method: string;
  created_at: string;
}

const emptyTour: Omit<TourData, "id" | "created_at"> = {
  customer: "", customer_id: "",
  vehicle_type: "", vehicle_type_id: "",
  tour_type: "one_way", pickup_address: "", destination_address: "",
  travel_date: "", assigned_rider: "", assigned_rider_id: "",
  quoted_fare: "", advance_amount: "", status: "pending",
  special_request: "", payment_method: "cash",
};

const advFilterFields: FilterField[] = [
  { key: "tour_type", label: "Tour Type", type: "select", options: [{ label: "One Way", value: "one_way" }, { label: "Round Trip", value: "round_trip" }, { label: "Full Day", value: "full_day_hire" }, { label: "Multi Stop", value: "multi_stop" }] },
  { key: "status", label: "Status", type: "select", options: ["pending", "quoted", "confirmed", "ongoing", "completed"].map(s => ({ label: s, value: s })) },
  { key: "travel_date", label: "Travel Date", type: "date_range" },
];

export default function TourBookings() {
  const [tours, setTours] = useState<TourData[]>([]);
  const { data } = useAdminResource<any>("tour_bookings", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "tour_bookings"],
    queryFn: () => fetchAdminStats("tour_bookings"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const { data: vehicleTypesData } = useQuery({
    queryKey: ["admin-resource", "vehicle_types"],
    queryFn: () => fetchAdminResource<any>("vehicle_types", { page_size: 100 }),
    staleTime: 60_000,
  });
  const vehicleTypes: { id: string; name: string }[] = vehicleTypesData?.results ?? [];

  const createMutation = useCreateResource("tour_bookings");
  const updateMutation = useUpdateResource("tour_bookings");
  const deleteMutation = useDeleteResource("tour_bookings");
  const [selected, setSelected] = useState<TourData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<TourData> & typeof emptyTour>(emptyTour);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TourData | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => {
    if (!data?.results) return;
    setTours(
      data.results.map((t: any) => ({
        id: t.id,
        customer: t.customer_full_name || "",
        customer_id: t.customer || "",
        vehicle_type: t.vehicle_type_name || "",
        vehicle_type_id: t.vehicle_type || "",
        tour_type: t.tour_type || "one_way",
        pickup_address: t.pickup_address || "",
        destination_address: t.destination_address || "",
        travel_date: t.travel_date || "",
        assigned_rider: t.assigned_rider_name || "",
        assigned_rider_id: t.assigned_rider || "",
        quoted_fare: t.quoted_fare ? String(t.quoted_fare) : "",
        advance_amount: t.advance_amount ? String(t.advance_amount) : "",
        status: t.status || "pending",
        special_request: t.special_request || "",
        payment_method: t.payment_method || "cash",
        created_at: t.created_at ? String(t.created_at).slice(0, 10) : "",
      }))
    );
  }, [data?.results]);

  const filtered = tours.filter(t => {
    if (searchQ) { const q = searchQ.toLowerCase(); if (!t.id.toLowerCase().includes(q) && !t.customer.toLowerCase().includes(q)) return false; }
    if (activeStatus !== "all" && t.status !== activeStatus) return false;
    if (advFilters.tour_type && t.tour_type !== advFilters.tour_type) return false;
    if (advFilters.status && t.status !== advFilters.status) return false;
    return true;
  });

  const handleCreate = () => { setEditing({ ...emptyTour, vehicle_type_id: vehicleTypes[0]?.id ?? "", vehicle_type: vehicleTypes[0]?.name ?? "" }); setIsEditing(false); setFormOpen(true); };
  const handleSave = () => {
    if (!editing.customer_id) { toast.error("Customer is required"); return; }
    if (!editing.pickup_address || !editing.destination_address) { toast.error("Pickup and destination are required"); return; }
    if (!editing.vehicle_type_id) { toast.error("Vehicle type is required"); return; }
    const { customer, customer_id, vehicle_type, vehicle_type_id, assigned_rider, assigned_rider_id, created_at, ...rest } = editing as any;
    const payload: Record<string, any> = {
      ...rest,
      customer: customer_id,
      vehicle_type: vehicle_type_id,
      ...(assigned_rider_id ? { assigned_rider: assigned_rider_id } : {}),
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate({ id: (editing as any).id, data: payload }, { onSuccess: () => { toast.success("Tour updated"); setFormOpen(false); } });
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Tour created"); setFormOpen(false); } });
    }
  };
  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, { onSuccess: () => {
        toast.success("Tour deleted"); setDeleteOpen(false); setDeleteTarget(null);
        if (selected?.id === deleteTarget.id) { setDrawerOpen(false); setSelected(null); }
      }});
    }
  };

  return (
    <>
      <ModulePage title="Tour Bookings" subtitle="Manage tour and outstation trips" createLabel="Create Tour"
        onCreate={handleCreate} onRowClick={(t: TourData) => { setSelected(t); setDrawerOpen(true); }}
        stats={[
          { label: "Total Tours", value: statsData?.total ?? tours.length },
          { label: "Pending", value: statsData?.by_status.pending ?? tours.filter(t => t.status === "pending").length },
          { label: "Confirmed", value: statsData?.by_status.confirmed ?? tours.filter(t => t.status === "confirmed").length },
          { label: "Ongoing", value: statsData?.by_status.ongoing ?? tours.filter(t => t.status === "ongoing").length, pulse: true },
          { label: "Completed", value: statsData?.by_status.completed ?? tours.filter(t => t.status === "completed").length },
          { label: "New Today", value: statsData?.today ?? 0 },
        ]}
        statusFilters={[{ label: "All", value: "all" }, { label: "Pending", value: "pending" }, { label: "Confirmed", value: "confirmed" }, { label: "Ongoing", value: "ongoing" }, { label: "Completed", value: "completed" }]}
        activeStatus={activeStatus} onStatusChange={setActiveStatus} onSearch={setSearchQ}
        searchPlaceholder="Search tour ID, customer..." columns={[
          { key: "id", label: "Tour ID", render: (r: TourData) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "customer", label: "Customer" },
          { key: "tour_type", label: "Type", render: (r: TourData) => <StatusBadge status={r.tour_type === "full_day_hire" ? "accepted" : "active"} /> },
          { key: "pickup_address", label: "Pickup" },
          { key: "destination_address", label: "Destination" },
          { key: "travel_date", label: "Date" },
          { key: "assigned_rider", label: "Rider", render: (r: TourData) => <span className={r.assigned_rider ? "" : "text-muted-foreground"}>{r.assigned_rider || "Unassigned"}</span> },
          { key: "quoted_fare", label: "Fare", render: (r: TourData) => <span className="font-mono">{r.quoted_fare ? `Rs. ${r.quoted_fare}` : "—"}</span> },
          { key: "status", label: "Status", render: (r: TourData) => <StatusBadge status={r.status} /> },
        ]} data={filtered}
        advancedFilterFields={advFilterFields} advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters} onAdvancedFilterClear={() => setAdvFilters({})}
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
                ["Customer", selected.customer], ["Type", selected.tour_type],
                ["Pickup", selected.pickup_address], ["Destination", selected.destination_address],
                ["Date", selected.travel_date], ["Vehicle", selected.vehicle_type],
                ["Rider", selected.assigned_rider || "Unassigned"],
                ["Fare", selected.quoted_fare ? `Rs. ${selected.quoted_fare}` : "—"],
                ["Advance", selected.advance_amount ? `Rs. ${selected.advance_amount}` : "—"],
                ["Payment", selected.payment_method], ["Status", selected.status],
                ["Notes", selected.special_request],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}><span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{k}</span><p className="text-sm font-medium">{v || "—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditing ? "Edit Tour" : "Create Tour"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="col-span-2">
              <UserSearchField
                value={editing.customer_id}
                displayName={editing.customer}
                onChange={(id, name) => setEditing(p => ({ ...p, customer_id: id, customer: name }))}
                disabled={isEditing}
                label="Customer"
              />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Tour Type</Label>
                <Select value={editing.tour_type} onValueChange={v => setEditing(p => ({ ...p, tour_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_way">One Way</SelectItem>
                    <SelectItem value="round_trip">Round Trip</SelectItem>
                    <SelectItem value="full_day_hire">Full Day</SelectItem>
                    <SelectItem value="multi_stop">Multi Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <div className="space-y-1.5"><Label className="text-sm">Pickup Address *</Label><Input value={editing.pickup_address} onChange={e => setEditing(p => ({ ...p, pickup_address: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-sm">Destination *</Label><Input value={editing.destination_address} onChange={e => setEditing(p => ({ ...p, destination_address: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-sm">Travel Date</Label><Input type="date" value={editing.travel_date} onChange={e => setEditing(p => ({ ...p, travel_date: e.target.value }))} /></div>
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
              <div className="space-y-1.5"><Label className="text-sm">Quoted Fare (Rs)</Label><Input type="number" value={editing.quoted_fare} onChange={e => setEditing(p => ({ ...p, quoted_fare: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-sm">Advance Amount (Rs)</Label><Input type="number" value={editing.advance_amount} onChange={e => setEditing(p => ({ ...p, advance_amount: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label className="text-sm">Status</Label>
                <Select value={editing.status} onValueChange={v => setEditing(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["pending", "quoted", "confirmed", "ongoing", "completed"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <EntitySearchField
              resource="riders"
              labelKey="user_full_name"
              secondaryKey="user_phone"
              value={editing.assigned_rider_id}
              displayName={editing.assigned_rider}
              onChange={(id, name) => setEditing(p => ({ ...p, assigned_rider_id: id, assigned_rider: name }))}
              label="Assigned Rider"
              placeholder="Search rider (optional)…"
            />
            <div className="space-y-1.5"><Label className="text-sm">Special Request / Notes</Label><Input value={editing.special_request} onChange={e => setEditing(p => ({ ...p, special_request: e.target.value }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={handleSave}>{isEditing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Tour" description={`Delete "${deleteTarget?.id}"?`} onConfirm={handleDelete} destructive />
    </>
  );
}
