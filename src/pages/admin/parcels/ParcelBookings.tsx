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
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminStats } from "@/lib/api";

interface ParcelData {
  id: string;
  sender: string;              // display name
  sender_id: string;           // FK UUID (User)
  sender_phone: string;
  receiver_name: string;
  receiver_phone: string;
  delivery_person: string;     // display name
  delivery_person_id: string;  // FK UUID (ParcelDeliveryProfile)
  sender_address: string;
  receiver_address: string;
  is_fragile: boolean;
  estimated_fare: string;
  status: string;
  source: string;
  parcel_weight_kg: string;
  created_at: string;
}

const emptyParcel: Omit<ParcelData, "id" | "created_at"> = {
  sender: "", sender_id: "", sender_phone: "",
  receiver_name: "", receiver_phone: "",
  delivery_person: "", delivery_person_id: "",
  sender_address: "", receiver_address: "",
  is_fragile: false, estimated_fare: "",
  status: "searching", source: "customer", parcel_weight_kg: "",
};

const advFilterFields: FilterField[] = [
  { key: "status", label: "Status", type: "select", options: ["searching", "accepted", "picked_up", "in_transit", "delivered", "cancelled"].map(s => ({ label: s, value: s })) },
  { key: "source", label: "Source", type: "select", options: ["customer", "ecommerce", "restaurant"].map(s => ({ label: s, value: s })) },
  { key: "is_fragile", label: "Fragile Only", type: "boolean" },
];

export default function ParcelBookings() {
  const [items, setItems] = useState<ParcelData[]>([]);
  const { data } = useAdminResource<any>("parcels", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "parcels"],
    queryFn: () => fetchAdminStats("parcels"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useCreateResource("parcels");
  const updateMutation = useUpdateResource("parcels");
  const deleteMutation = useDeleteResource("parcels");
  const [selected, setSelected] = useState<ParcelData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ParcelData> & typeof emptyParcel>(emptyParcel);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ParcelData | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => {
    if (!data?.results) return;
    setItems(
      data.results.map((p: any) => ({
        id: p.id,
        sender: p.sender_full_name || "",
        sender_id: p.sender || "",
        sender_phone: p.sender_phone || "",
        receiver_name: p.receiver_name || "",
        receiver_phone: p.receiver_phone || "",
        delivery_person: p.delivery_person_name || "",
        delivery_person_id: p.delivery_person || "",
        sender_address: p.sender_address || "",
        receiver_address: p.receiver_address || "",
        is_fragile: Boolean(p.is_fragile),
        estimated_fare: p.estimated_fare ? String(p.estimated_fare) : "",
        status: p.status || "searching",
        source: p.source || "",
        parcel_weight_kg: p.parcel_weight_kg ? String(p.parcel_weight_kg) : "",
        created_at: p.created_at ? String(p.created_at).slice(0, 19).replace("T", " ") : "",
      }))
    );
  }, [data?.results]);

  const filtered = items.filter(p => {
    if (searchQ) { const q = searchQ.toLowerCase(); if (!p.id.toLowerCase().includes(q) && !p.sender.toLowerCase().includes(q) && !p.receiver_name.toLowerCase().includes(q)) return false; }
    if (activeStatus !== "all" && p.status !== activeStatus) return false;
    if (advFilters.status && p.status !== advFilters.status) return false;
    if (advFilters.source && p.source !== advFilters.source) return false;
    if (advFilters.is_fragile && !p.is_fragile) return false;
    return true;
  });

  const handleCreate = () => { setEditing({ ...emptyParcel }); setIsEditing(false); setFormOpen(true); };
  const handleSave = () => {
    if (!editing.sender_id) { toast.error("Sender is required"); return; }
    if (!editing.receiver_name) { toast.error("Receiver name is required"); return; }
    if (!editing.sender_address) { toast.error("Pickup address is required"); return; }
    const { sender, sender_id, delivery_person, delivery_person_id, created_at, ...rest } = editing as any;
    const payload: Record<string, any> = {
      ...rest,
      sender: sender_id,
      ...(delivery_person_id ? { delivery_person: delivery_person_id } : {}),
      estimated_fare: rest.estimated_fare ? parseFloat(rest.estimated_fare) : null,
      parcel_weight_kg: rest.parcel_weight_kg ? parseFloat(rest.parcel_weight_kg) : null,
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate({ id: (editing as any).id, data: payload }, { onSuccess: () => { toast.success("Parcel updated"); setFormOpen(false); } });
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Parcel created"); setFormOpen(false); } });
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
      <ModulePage title="Parcel Bookings" subtitle="Monitor all parcel deliveries" createLabel="Create Parcel"
        onCreate={handleCreate} onRowClick={(p: ParcelData) => { setSelected(p); setDrawerOpen(true); }}
        stats={[
          { label: "Total", value: statsData?.total ?? items.length },
          { label: "Live", value: statsData ? ((statsData.by_status.accepted || 0) + (statsData.by_status.picked_up || 0) + (statsData.by_status.in_transit || 0)) : items.filter(p => ["accepted", "picked_up", "in_transit"].includes(p.status)).length, pulse: true },
          { label: "Delivered", value: statsData?.by_status.delivered ?? items.filter(p => p.status === "delivered").length },
          { label: "Cancelled", value: statsData?.by_status.cancelled ?? items.filter(p => p.status === "cancelled").length },
          { label: "New Today", value: statsData?.today ?? 0 },
          { label: "Revenue", value: statsData?.total_amount != null ? `Rs. ${(statsData.total_amount / 1000).toFixed(1)}K` : "—" },
        ]}
        statusFilters={[{ label: "All", value: "all" }, { label: "Searching", value: "searching" }, { label: "In Transit", value: "in_transit" }, { label: "Delivered", value: "delivered" }, { label: "Cancelled", value: "cancelled" }]}
        activeStatus={activeStatus} onStatusChange={setActiveStatus} onSearch={setSearchQ}
        searchPlaceholder="Search parcel ID, sender, receiver..." columns={[
          { key: "id", label: "ID", render: (r: ParcelData) => <span className="font-mono text-xs font-semibold">{r.id}</span> },
          { key: "sender", label: "Sender" }, { key: "receiver_name", label: "Receiver" },
          { key: "delivery_person", label: "Agent", render: (r: ParcelData) => <span className={r.delivery_person ? "" : "text-muted-foreground"}>{r.delivery_person || "—"}</span> },
          { key: "is_fragile", label: "Fragile", render: (r: ParcelData) => r.is_fragile ? "⚠️ Yes" : "No" },
          { key: "estimated_fare", label: "Fare", render: (r: ParcelData) => r.estimated_fare ? <span className="font-mono">Rs. {r.estimated_fare}</span> : <span className="text-muted-foreground">—</span> },
          { key: "status", label: "Status", render: (r: ParcelData) => <StatusBadge status={r.status} /> },
          { key: "source", label: "Source" }, { key: "created_at", label: "Created" },
        ]} data={filtered}
        advancedFilterFields={advFilterFields} advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters} onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.id || ""} subtitle={`${selected?.sender} → ${selected?.receiver_name}`}>
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing({ ...selected }); setIsEditing(true); setFormOpen(true); setDrawerOpen(false); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["Sender", selected.sender], ["Sender Phone", selected.sender_phone],
                ["Receiver", selected.receiver_name], ["Receiver Phone", selected.receiver_phone],
                ["Agent", selected.delivery_person || "Unassigned"],
                ["Pickup", selected.sender_address], ["Drop", selected.receiver_address],
                ["Fragile", selected.is_fragile ? "Yes" : "No"], ["Weight (kg)", selected.parcel_weight_kg],
                ["Fare", selected.estimated_fare ? `Rs. ${selected.estimated_fare}` : "—"],
                ["Status", selected.status], ["Source", selected.source],
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
          <DialogHeader><DialogTitle>{isEditing ? "Edit Parcel" : "Create Parcel"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <UserSearchField
              value={editing.sender_id}
              displayName={editing.sender}
              onChange={(id, name) => setEditing(p => ({ ...p, sender_id: id, sender: name }))}
              disabled={isEditing}
              label="Sender"
            />
            <EntitySearchField
              resource="parcel_agents"
              labelKey="user_full_name"
              secondaryKey="user_phone"
              value={editing.delivery_person_id}
              displayName={editing.delivery_person}
              onChange={(id, name) => setEditing(p => ({ ...p, delivery_person_id: id, delivery_person: name }))}
              label="Delivery Agent"
              placeholder="Search agent (optional)…"
            />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-sm">Receiver Name *</Label><Input value={editing.receiver_name} onChange={e => setEditing(p => ({ ...p, receiver_name: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-sm">Receiver Phone</Label><Input value={editing.receiver_phone} onChange={e => setEditing(p => ({ ...p, receiver_phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-sm">Sender Phone</Label><Input value={editing.sender_phone} onChange={e => setEditing(p => ({ ...p, sender_phone: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-sm">Weight (kg)</Label><Input type="number" value={editing.parcel_weight_kg} onChange={e => setEditing(p => ({ ...p, parcel_weight_kg: e.target.value }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-sm">Pickup Address *</Label><Input value={editing.sender_address} onChange={e => setEditing(p => ({ ...p, sender_address: e.target.value }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-sm">Drop Address</Label><Input value={editing.receiver_address} onChange={e => setEditing(p => ({ ...p, receiver_address: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-sm">Estimated Fare (Rs)</Label><Input type="number" value={editing.estimated_fare} onChange={e => setEditing(p => ({ ...p, estimated_fare: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label className="text-sm">Source</Label>
                <Select value={editing.source} onValueChange={v => setEditing(p => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="ecommerce">Ecommerce</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Status</Label>
                <Select value={editing.status} onValueChange={v => setEditing(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["searching", "accepted", "picked_up", "in_transit", "delivered", "cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border col-span-2"><Label>Fragile</Label><Switch checked={editing.is_fragile} onCheckedChange={v => setEditing(p => ({ ...p, is_fragile: v }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={handleSave}>{isEditing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Parcel" description={`Delete "${deleteTarget?.id}"?`} onConfirm={handleDelete} destructive />
    </>
  );
}
