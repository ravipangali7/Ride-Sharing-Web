import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Column } from "@/components/admin/DataTable";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ImagePickerField } from "@/components/admin/ImagePickerField";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { UserSearchField } from "@/components/admin/UserSearchField";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminResource, fetchAdminStats } from "@/lib/api";

interface AgentData {
  id: string;
  user_id: string;
  user_name: string;
  phone: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  license_photo: string;
  citizenship_photo_front: string;
  rating: number;
  is_online: boolean;
  is_approved: boolean;
  created_at: string;
}

const emptyAgent: Omit<AgentData, "id" | "created_at"> = {
  user_id: "", user_name: "", phone: "",
  vehicle_type: "", vehicle_number: "",
  license_number: "", license_photo: "", citizenship_photo_front: "",
  rating: 5, is_online: false, is_approved: false,
};

const advFilterFields: FilterField[] = [
  { key: "is_approved", label: "Approved Only", type: "boolean" },
  { key: "is_online", label: "Online Only", type: "boolean" },
];

export default function ParcelAgents() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const { data } = useAdminResource<any>("parcel_agents", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "parcel_agents"],
    queryFn: () => fetchAdminStats("parcel_agents"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const { data: vehicleTypesData } = useQuery({
    queryKey: ["admin-resource", "vehicle_types"],
    queryFn: () => fetchAdminResource<any>("vehicle_types", { page_size: 100 }),
    staleTime: 60_000,
  });
  const vehicleTypes: { id: string; name: string }[] = vehicleTypesData?.results ?? [];

  const createMutation = useCreateResource("parcel_agents");
  const updateMutation = useUpdateResource("parcel_agents");
  const deleteMutation = useDeleteResource("parcel_agents");
  const [selected, setSelected] = useState<AgentData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<AgentData> & typeof emptyAgent>(emptyAgent);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AgentData | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => {
    if (!data?.results) return;
    setAgents(
      data.results.map((a: any) => ({
        id: a.id,
        user_id: a.user || "",
        user_name: a.user_full_name || "",
        phone: a.user_phone || "",
        vehicle_type: a.vehicle_type || "",
        vehicle_number: a.vehicle_number || "",
        license_number: a.license_number || "",
        license_photo: a.license_photo || "",
        citizenship_photo_front: a.citizenship_photo_front || "",
        rating: Number(a.rating || 0),
        is_online: Boolean(a.is_online),
        is_approved: Boolean(a.is_approved),
        created_at: a.created_at ? String(a.created_at).slice(0, 10) : "",
      }))
    );
  }, [data?.results]);

  const filtered = agents.filter(a => {
    if (searchQ) { const q = searchQ.toLowerCase(); if (!a.user_name.toLowerCase().includes(q) && !a.phone.includes(q) && !a.vehicle_number.toLowerCase().includes(q)) return false; }
    if (activeStatus === "online" && !a.is_online) return false;
    if (activeStatus === "offline" && a.is_online) return false;
    if (activeStatus === "approved" && !a.is_approved) return false;
    if (activeStatus === "pending" && a.is_approved) return false;
    if (advFilters.is_online && !a.is_online) return false;
    if (advFilters.is_approved && !a.is_approved) return false;
    return true;
  });

  const handleCreate = () => { setEditing({ ...emptyAgent, vehicle_type: vehicleTypes[0]?.id ?? "" }); setIsEditing(false); setFormOpen(true); };
  const handleEdit = (a: AgentData) => { setEditing({ ...a }); setIsEditing(true); setFormOpen(true); };
  const handleSave = () => {
    if (!editing.user_id) { toast.error("Please select a user"); return; }
    if (!editing.license_number) { toast.error("License number is required"); return; }
    // Remap user_id -> user and drop display-only fields; backend FK remapper handles user->user_id and vehicle_type->vehicle_type_id
    const { user_id, user_name, phone, ...rest } = editing as any;
    const payload: Record<string, any> = { ...rest, user: user_id };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate({ id: (editing as any).id, data: payload }, { onSuccess: () => { toast.success("Agent updated"); setFormOpen(false); } });
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Agent created"); setFormOpen(false); } });
    }
  };
  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, { onSuccess: () => {
        toast.success("Agent deleted"); setDeleteOpen(false); setDeleteTarget(null);
        if (selected?.id === deleteTarget.id) { setDrawerOpen(false); setSelected(null); }
      }});
    }
  };

  const columns: Column<AgentData>[] = [
    { key: "id", label: "ID", render: r => <span className="font-mono text-xs font-semibold text-primary">{r.id}</span> },
    { key: "user_name", label: "Name", render: r => (<div><span className="font-medium text-sm block">{r.user_name || "—"}</span><span className="text-[10px] text-muted-foreground font-mono">{r.phone}</span></div>) },
    { key: "vehicle_type", label: "Vehicle", render: r => <span>{vehicleTypes.find(vt => vt.id === r.vehicle_type)?.name || r.vehicle_type || "—"}</span> },
    { key: "vehicle_number", label: "Vehicle No", render: r => <span className="font-mono text-xs">{r.vehicle_number}</span> },
    { key: "rating", label: "Rating", render: r => <span>⭐ {r.rating}</span> },
    { key: "is_online", label: "Status", render: r => <StatusBadge status={r.is_online ? "online" : "offline"} pulse={r.is_online} /> },
    { key: "is_approved", label: "Approved", render: r => <StatusBadge status={r.is_approved ? "approved" : "pending"} /> },
  ];

  return (
    <>
      <ModulePage
        title="Parcel Delivery Agents" subtitle="Manage parcel delivery partners" createLabel="Add Agent"
        onCreate={handleCreate} onRowClick={(a: AgentData) => { setSelected(a); setDrawerOpen(true); }}
        stats={[
          { label: "Total Agents", value: statsData?.total ?? agents.length },
          { label: "Online", value: statsData?.bool_counts.is_online ?? agents.filter(a => a.is_online).length, pulse: true },
          { label: "Pending", value: statsData ? (statsData.total - (statsData.bool_counts.is_approved ?? 0)) : agents.filter(a => !a.is_approved).length },
          { label: "Approved", value: statsData?.bool_counts.is_approved ?? agents.filter(a => a.is_approved).length },
          { label: "New Today", value: statsData?.today ?? 0 },
          { label: "Avg Rating", value: agents.length > 0 ? (agents.reduce((s, a) => s + a.rating, 0) / agents.length).toFixed(2) : "—" },
        ]}
        statusFilters={[{ label: "All", value: "all" }, { label: "Online", value: "online" }, { label: "Offline", value: "offline" }, { label: "Approved", value: "approved" }, { label: "Pending", value: "pending" }]}
        activeStatus={activeStatus} onStatusChange={setActiveStatus} onSearch={setSearchQ}
        searchPlaceholder="Search name, phone, vehicle no..." columns={columns} data={filtered}
        advancedFilterFields={advFilterFields} advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters} onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.user_name || ""} subtitle={selected?.id}>
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { handleEdit(selected); setDrawerOpen(false); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["Name", selected.user_name],
                ["Phone", selected.phone],
                ["License No", selected.license_number],
                ["Vehicle", vehicleTypes.find(vt => vt.id === selected.vehicle_type)?.name || selected.vehicle_type],
                ["Vehicle No", selected.vehicle_number],
                ["Rating", `⭐ ${selected.rating}`],
                ["Status", selected.is_online ? "Online" : "Offline"],
                ["Approved", selected.is_approved ? "Yes" : "No"],
                ["Joined", selected.created_at],
              ] as [string, string][]).map(([l, v]) => (
                <div key={l} className="space-y-0.5">
                  <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{l}</span>
                  <p className="text-sm font-medium">{v || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditing ? "Edit Agent" : "Add Agent"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <UserSearchField
              value={editing.user_id}
              displayName={editing.user_name}
              onChange={(id, name) => setEditing(p => ({ ...p, user_id: id, user_name: name }))}
              disabled={isEditing}
            />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm">License Number *</Label>
                <Input value={editing.license_number} onChange={e => setEditing(p => ({ ...p, license_number: e.target.value }))} />
              </div>
              <ImagePickerField label="License Photo" value={editing.license_photo} onChange={v => setEditing(p => ({ ...p, license_photo: v }))} />
              <ImagePickerField label="Citizenship Front" value={editing.citizenship_photo_front} onChange={v => setEditing(p => ({ ...p, citizenship_photo_front: v }))} />
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Vehicle Type</Label>
                <Select value={editing.vehicle_type} onValueChange={v => setEditing(p => ({ ...p, vehicle_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{vehicleTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Vehicle Number</Label>
                <Input value={editing.vehicle_number} onChange={e => setEditing(p => ({ ...p, vehicle_number: e.target.value }))} placeholder="BA X PA XXXX" />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 rounded-lg border"><Label>Online</Label><Switch checked={editing.is_online} onCheckedChange={v => setEditing(p => ({ ...p, is_online: v }))} /></div>
              <div className="flex items-center justify-between p-3 rounded-lg border"><Label>Approved</Label><Switch checked={editing.is_approved} onCheckedChange={v => setEditing(p => ({ ...p, is_approved: v }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isEditing ? "Save" : "Add Agent"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Agent" description={`Delete "${deleteTarget?.user_name}"?`} onConfirm={handleDelete} destructive />
    </>
  );
}

