import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
import { UserSearchField } from "@/components/admin/UserSearchField";
import { MapPickerField } from "@/components/admin/MapPickerField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminStats } from "@/lib/api";

interface RestaurantData {
  id: string;
  name: string;
  owner: string;           // display name
  owner_id: string;        // FK UUID (User)
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  is_open: boolean;
  is_approved: boolean;
  is_cloud_kitchen: boolean;
  delivery_radius_km: string;
  description: string;
  rating: number;           // display only (from API)
  created_at: string;       // display only
}

const emptyRestaurant: Omit<RestaurantData, "id" | "created_at" | "rating"> = {
  name: "", owner: "", owner_id: "", address: "", phone: "",
  latitude: 27.7172, longitude: 85.324,
  is_open: true, is_approved: false, is_cloud_kitchen: false,
  delivery_radius_km: "5", description: "",
};

const advFilterFields: FilterField[] = [
  { key: "is_open", label: "Open Only", type: "boolean" },
  { key: "is_approved", label: "Approved Only", type: "boolean" },
  { key: "is_cloud_kitchen", label: "Cloud Kitchen", type: "boolean" },
];

export default function Restaurants() {
  const [items, setItems] = useState<RestaurantData[]>([]);
  const { data } = useAdminResource<any>("restaurants", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "restaurants"],
    queryFn: () => fetchAdminStats("restaurants"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useCreateResource("restaurants");
  const updateMutation = useUpdateResource("restaurants");
  const deleteMutation = useDeleteResource("restaurants");
  const [selected, setSelected] = useState<RestaurantData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<RestaurantData> & typeof emptyRestaurant>(emptyRestaurant);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RestaurantData | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => {
    if (!data?.results) return;
    setItems(
      data.results.map((r: any) => ({
        id: r.id,
        name: r.name || "",
        owner: r.owner_full_name || "",
        owner_id: r.owner || "",
        address: r.address || "",
        phone: r.phone || "",
        latitude: Number(r.latitude) || 27.7172,
        longitude: Number(r.longitude) || 85.324,
        is_open: Boolean(r.is_open),
        is_approved: Boolean(r.is_approved),
        is_cloud_kitchen: Boolean(r.is_cloud_kitchen),
        delivery_radius_km: r.delivery_radius_km ? String(r.delivery_radius_km) : "",
        description: r.description || "",
        rating: Number(r.avg_rating || 0),
        created_at: r.created_at ? String(r.created_at).slice(0, 10) : "",
      }))
    );
  }, [data?.results]);

  const filtered = items.filter(r => {
    if (searchQ) { const q = searchQ.toLowerCase(); if (!r.name.toLowerCase().includes(q) && !r.owner.toLowerCase().includes(q)) return false; }
    if (activeStatus === "open" && !r.is_open) return false;
    if (activeStatus === "closed" && r.is_open) return false;
    if (activeStatus === "approved" && !r.is_approved) return false;
    if (activeStatus === "pending" && r.is_approved) return false;
    if (advFilters.is_open && !r.is_open) return false;
    if (advFilters.is_approved && !r.is_approved) return false;
    if (advFilters.is_cloud_kitchen && !r.is_cloud_kitchen) return false;
    return true;
  });

  const handleCreate = () => { setEditing({ ...emptyRestaurant }); setIsEditing(false); setFormOpen(true); };
  const handleSave = () => {
    if (!editing.name) { toast.error("Name is required"); return; }
    if (!editing.owner_id) { toast.error("Owner is required"); return; }
    if (!editing.phone?.trim()) { toast.error("Phone is required"); return; }
    const payload: Record<string, any> = {
      owner: editing.owner_id,
      name: editing.name,
      description: editing.description || "",
      address: editing.address || "",
      phone: editing.phone.trim(),
      latitude: editing.latitude ?? 27.7172,
      longitude: editing.longitude ?? 85.324,
      delivery_radius_km: editing.delivery_radius_km ? parseFloat(editing.delivery_radius_km) : 5,
      is_open: Boolean(editing.is_open),
      is_approved: Boolean(editing.is_approved),
      is_cloud_kitchen: Boolean(editing.is_cloud_kitchen),
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate({ id: (editing as any).id, data: payload }, { onSuccess: () => { toast.success("Restaurant updated"); setFormOpen(false); } });
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Restaurant created"); setFormOpen(false); } });
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
      <ModulePage title="Restaurants" subtitle="Manage all restaurants" createLabel="Add Restaurant"
        onCreate={handleCreate} onRowClick={(r: RestaurantData) => { setSelected(r); setDrawerOpen(true); }}
        stats={[
          { label: "Total", value: statsData?.total ?? items.length },
          { label: "Open Now", value: statsData?.bool_counts.is_open ?? items.filter(r => r.is_open).length, pulse: true },
          { label: "Approved", value: statsData?.bool_counts.is_approved ?? items.filter(r => r.is_approved).length },
          { label: "Pending", value: statsData ? (statsData.total - (statsData.bool_counts.is_approved ?? 0)) : items.filter(r => !r.is_approved).length },
          { label: "New Today", value: statsData?.today ?? 0 },
          { label: "Avg Rating", value: items.length > 0 ? (items.reduce((s, r) => s + r.rating, 0) / items.length).toFixed(1) : "—" },
        ]}
        statusFilters={[{ label: "All", value: "all" }, { label: "Open", value: "open" }, { label: "Closed", value: "closed" }, { label: "Approved", value: "approved" }, { label: "Pending", value: "pending" }]}
        activeStatus={activeStatus} onStatusChange={setActiveStatus} onSearch={setSearchQ}
        searchPlaceholder="Search restaurant, owner..." columns={[
          { key: "name", label: "Name", render: (r: RestaurantData) => <span className="font-medium">{r.name}</span> },
          { key: "owner", label: "Owner" }, { key: "address", label: "Address" },
          { key: "is_open", label: "Open", render: (r: RestaurantData) => <StatusBadge status={r.is_open ? "online" : "offline"} pulse={r.is_open} /> },
          { key: "rating", label: "Rating", render: (r: RestaurantData) => <span>⭐ {r.rating}</span> },
          { key: "is_approved", label: "Approved", render: (r: RestaurantData) => <StatusBadge status={r.is_approved ? "approved" : "pending"} /> },
          { key: "is_cloud_kitchen", label: "Cloud", render: (r: RestaurantData) => r.is_cloud_kitchen ? "☁️" : "—" },
        ]} data={filtered}
        advancedFilterFields={advFilterFields} advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters} onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.name || ""} subtitle={selected?.id}>
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing({ ...selected }); setIsEditing(true); setFormOpen(true); setDrawerOpen(false); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["Name", selected.name], ["Owner", selected.owner], ["Phone", selected.phone],
                ["Address", selected.address], ["Location", `${selected.latitude}, ${selected.longitude}`],
                ["Open", selected.is_open ? "Yes" : "No"], ["Rating", `⭐ ${selected.rating}`],
                ["Approved", selected.is_approved ? "Yes" : "No"], ["Cloud Kitchen", selected.is_cloud_kitchen ? "Yes" : "No"],
                ["Delivery Radius", selected.delivery_radius_km ? `${selected.delivery_radius_km} km` : "—"],
                ["Created", selected.created_at], ["Description", selected.description],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}><span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{k}</span><p className="text-sm font-medium">{v || "—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditing ? "Edit Restaurant" : "Add Restaurant"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label className="text-sm">Name *</Label><Input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} /></div>
            <UserSearchField
              value={editing.owner_id}
              displayName={editing.owner}
              onChange={(id, name) => setEditing(p => ({ ...p, owner_id: id, owner: name }))}
              disabled={isEditing}
              label="Owner"
            />
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-sm">Phone *</Label>
              <Input value={editing.phone} onChange={e => setEditing(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. 9800000000" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2"><Label className="text-sm">Address</Label><Input value={editing.address} onChange={e => setEditing(p => ({ ...p, address: e.target.value }))} /></div>
              <div className="col-span-2">
                <MapPickerField
                  label="Restaurant location"
                  latitude={editing.latitude ?? 27.7172}
                  longitude={editing.longitude ?? 85.324}
                  onLocationChange={(lat, lng) => setEditing(p => ({ ...p, latitude: lat, longitude: lng }))}
                />
              </div>
              <div className="space-y-1.5 col-span-2"><Label className="text-sm">Delivery Radius (km)</Label><Input type="number" value={editing.delivery_radius_km} onChange={e => setEditing(p => ({ ...p, delivery_radius_km: e.target.value }))} /></div>
              <div className="flex items-center justify-between p-3 rounded-lg border"><Label>Open</Label><Switch checked={editing.is_open} onCheckedChange={v => setEditing(p => ({ ...p, is_open: v }))} /></div>
              <div className="flex items-center justify-between p-3 rounded-lg border"><Label>Approved</Label><Switch checked={editing.is_approved} onCheckedChange={v => setEditing(p => ({ ...p, is_approved: v }))} /></div>
              <div className="flex items-center justify-between p-3 rounded-lg border"><Label>Cloud Kitchen</Label><Switch checked={editing.is_cloud_kitchen} onCheckedChange={v => setEditing(p => ({ ...p, is_cloud_kitchen: v }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-sm">Description</Label><Textarea value={editing.description} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={handleSave}>{isEditing ? "Save" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Restaurant" description={`Delete "${deleteTarget?.name}"?`} onConfirm={handleDelete} destructive />
    </>
  );
}
