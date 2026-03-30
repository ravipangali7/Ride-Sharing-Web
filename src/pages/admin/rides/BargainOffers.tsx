import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
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
import { fetchAdminStats } from "@/lib/api";

interface BargainData {
  id: string;
  ride: string;             // FK UUID (RideBooking)
  ride_display: string;     // display (short UUID)
  rider: string;            // display name
  rider_id: string;         // FK UUID (RiderProfile)
  offered_price: string;    // numeric string
  status: string;
  created_at: string;
}

const emptyBargain: Omit<BargainData, "id" | "created_at"> = {
  ride: "", ride_display: "",
  rider: "", rider_id: "",
  offered_price: "",
  status: "pending",
};

const advFilterFields: FilterField[] = [
  { key: "status", label: "Status", type: "select", options: ["pending", "accepted", "rejected", "expired"].map(s => ({ label: s, value: s })) },
];

export default function BargainOffers() {
  const [items, setItems] = useState<BargainData[]>([]);
  const { data } = useAdminResource<any>("ride_bargains", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "ride_bargains"],
    queryFn: () => fetchAdminStats("ride_bargains"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useCreateResource("ride_bargains");
  const updateMutation = useUpdateResource("ride_bargains");
  const deleteMutation = useDeleteResource("ride_bargains");
  const [selected, setSelected] = useState<BargainData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BargainData> & typeof emptyBargain>(emptyBargain);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BargainData | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => {
    if (!data?.results) return;
    setItems(
      data.results.map((b: any) => ({
        id: b.id,
        ride: b.ride || "",
        ride_display: b.ride ? String(b.ride).slice(0, 8) : "",
        rider: b.rider_name || "",
        rider_id: b.rider || "",
        offered_price: b.offered_price ? String(b.offered_price) : "",
        status: b.status || "pending",
        created_at: b.created_at ? String(b.created_at).slice(0, 19).replace("T", " ") : "",
      }))
    );
  }, [data?.results]);

  const filtered = items.filter(b => {
    if (searchQ && !b.ride_display.toLowerCase().includes(searchQ.toLowerCase()) && !b.rider.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (activeStatus !== "all" && b.status !== activeStatus) return false;
    if (advFilters.status && b.status !== advFilters.status) return false;
    return true;
  });

  const handleCreate = () => { setEditing({ ...emptyBargain }); setIsEditing(false); setFormOpen(true); };
  const handleSave = () => {
    if (!editing.ride) { toast.error("Ride booking is required"); return; }
    if (!editing.rider_id) { toast.error("Rider is required"); return; }
    if (!editing.offered_price) { toast.error("Offered price is required"); return; }
    const { ride_display, rider, rider_id, created_at, ...rest } = editing as any;
    const payload: Record<string, any> = {
      ...rest,
      rider: rider_id,
      offered_price: parseFloat(editing.offered_price) || 0,
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate({ id: (editing as any).id, data: payload }, { onSuccess: () => { toast.success("Bargain updated"); setFormOpen(false); } });
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Bargain created"); setFormOpen(false); } });
    }
  };
  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, { onSuccess: () => {
        toast.success("Deleted"); setDeleteOpen(false); setDeleteTarget(null);
        if (selected?.id === deleteTarget.id) { setDrawerOpen(false); setSelected(null); }
      }});
    }
  };

  return (
    <>
      <ModulePage title="Bargain Offers" subtitle="All ride bargain offers" createLabel="Create New"
        onCreate={handleCreate} onRowClick={(b: BargainData) => { setSelected(b); setDrawerOpen(true); }}
        stats={[
          { label: "Total", value: statsData?.total ?? items.length },
          { label: "Accepted", value: statsData?.by_status.accepted ?? items.filter(b => b.status === "accepted").length },
          { label: "Pending", value: statsData?.by_status.pending ?? items.filter(b => b.status === "pending").length },
          { label: "Rejected", value: statsData?.by_status.rejected ?? items.filter(b => b.status === "rejected").length },
          { label: "New Today", value: statsData?.today ?? 0 },
          { label: "Accept Rate", value: statsData && statsData.total > 0 ? `${((statsData.by_status.accepted || 0) / statsData.total * 100).toFixed(1)}%` : "—" },
        ]}
        statusFilters={[{ label: "All", value: "all" }, { label: "Pending", value: "pending" }, { label: "Accepted", value: "accepted" }, { label: "Rejected", value: "rejected" }]}
        activeStatus={activeStatus} onStatusChange={setActiveStatus} onSearch={setSearchQ}
        searchPlaceholder="Search ride ID, rider..." columns={[
          { key: "ride_display", label: "Ride ID", render: (r: BargainData) => <span className="font-mono text-xs">{r.ride_display}</span> },
          { key: "rider", label: "Rider" },
          { key: "offered_price", label: "Offered", render: (r: BargainData) => <span className="font-mono">Rs. {r.offered_price}</span> },
          { key: "status", label: "Status", render: (r: BargainData) => <StatusBadge status={r.status} /> },
          { key: "created_at", label: "Created" },
        ]} data={filtered}
        advancedFilterFields={advFilterFields} advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters} onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.ride_display || ""} subtitle={selected?.rider}>
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing({ ...selected }); setIsEditing(true); setFormOpen(true); setDrawerOpen(false); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["Ride ID", selected.ride_display],
                ["Rider", selected.rider],
                ["Offered Price", `Rs. ${selected.offered_price}`],
                ["Status", selected.status],
                ["Created", selected.created_at],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}><span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{k}</span><p className="text-sm font-medium">{v || "—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{isEditing ? "Edit Bargain" : "Create Bargain"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <EntitySearchField
              resource="ride_bookings"
              labelKey="id"
              value={editing.ride}
              displayName={editing.ride_display}
              onChange={(id) => setEditing(p => ({ ...p, ride: id, ride_display: id.slice(0, 8) }))}
              label="Ride Booking"
              required
              disabled={isEditing}
            />
            <EntitySearchField
              resource="riders"
              labelKey="user_full_name"
              secondaryKey="user_phone"
              value={editing.rider_id}
              displayName={editing.rider}
              onChange={(id, name) => setEditing(p => ({ ...p, rider_id: id, rider: name }))}
              label="Rider"
              required
            />
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-sm">Offered Price (Rs) *</Label>
              <Input type="number" value={editing.offered_price} onChange={e => setEditing(p => ({ ...p, offered_price: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Status</Label>
              <Select value={editing.status} onValueChange={v => setEditing(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pending", "accepted", "rejected", "expired"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={handleSave}>{isEditing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Bargain" description={`Delete "${deleteTarget?.id}"?`} onConfirm={handleDelete} destructive />
    </>
  );
}
