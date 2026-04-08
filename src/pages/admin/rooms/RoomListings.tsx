import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
import { EntitySearchField } from "@/components/admin/EntitySearchField";
import { MapPickerField } from "@/components/admin/MapPickerField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminStats } from "@/lib/api";

const ROOM_TYPES = ["single", "double", "flat", "hostel", "pg"] as const;
const GENDERS = ["any", "male", "female"] as const;
const SVC_TYPES = ["percentage", "membership"] as const;

interface Row {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  description: string;
  full_address: string;
  latitude: number;
  longitude: number;
  city: string;
  area: string;
  room_type: string;
  floor: string;
  total_floors: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: string;
  advance_months: number;
  is_furnished: boolean;
  has_parking: boolean;
  has_wifi: boolean;
  has_water: boolean;
  has_electricity: boolean;
  allowed_gender: string;
  is_available: boolean;
  is_approved: boolean;
  service_charge_type: string;
  service_charge_value: string;
  views_count: number;
  created_at: string;
}

function emptyRow(): Omit<Row, "id" | "views_count" | "created_at"> {
  return {
    owner_id: "",
    owner_name: "",
    title: "",
    description: "",
    full_address: "",
    latitude: 27.7172,
    longitude: 85.324,
    city: "",
    area: "",
    room_type: "single",
    floor: "",
    total_floors: "",
    bedrooms: 1,
    bathrooms: 1,
    monthly_rent: "",
    advance_months: 2,
    is_furnished: false,
    has_parking: false,
    has_wifi: false,
    has_water: false,
    has_electricity: false,
    allowed_gender: "any",
    is_available: true,
    is_approved: false,
    service_charge_type: "percentage",
    service_charge_value: "0",
  };
}

const advFilterFields: FilterField[] = [
  { key: "is_available", label: "Available only", type: "boolean" },
  { key: "is_approved", label: "Approved only", type: "boolean" },
  { key: "room_type", label: "Room type", type: "select", options: ROOM_TYPES.map((t) => ({ label: t, value: t })) },
];

export default function RoomListingsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const { data } = useAdminResource<any>("room_listings", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "room_listings"],
    queryFn: () => fetchAdminStats("room_listings"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useCreateResource("room_listings");
  const updateMutation = useUpdateResource("room_listings");
  const deleteMutation = useDeleteResource("room_listings");
  const [selected, setSelected] = useState<Row | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Row> & ReturnType<typeof emptyRow>>(emptyRow());
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => {
    if (!data?.results) return;
    setRows(
      data.results.map((r: any) => ({
        id: r.id,
        owner_id: r.owner || "",
        owner_name: r.owner_display_name || "",
        title: r.title || "",
        description: r.description || "",
        full_address: r.full_address || "",
        latitude: Number(r.latitude) || 27.7172,
        longitude: Number(r.longitude) || 85.324,
        city: r.city || "",
        area: r.area || "",
        room_type: r.room_type || "single",
        floor: r.floor != null ? String(r.floor) : "",
        total_floors: r.total_floors != null ? String(r.total_floors) : "",
        bedrooms: Number(r.bedrooms) || 1,
        bathrooms: Number(r.bathrooms) || 1,
        monthly_rent: r.monthly_rent != null ? String(r.monthly_rent) : "",
        advance_months: Number(r.advance_months) || 2,
        is_furnished: Boolean(r.is_furnished),
        has_parking: Boolean(r.has_parking),
        has_wifi: Boolean(r.has_wifi),
        has_water: Boolean(r.has_water),
        has_electricity: Boolean(r.has_electricity),
        allowed_gender: r.allowed_gender || "any",
        is_available: r.is_available !== false,
        is_approved: Boolean(r.is_approved),
        service_charge_type: r.service_charge_type || "percentage",
        service_charge_value: r.service_charge_value != null ? String(r.service_charge_value) : "0",
        views_count: Number(r.views_count) || 0,
        created_at: r.created_at ? String(r.created_at).slice(0, 10) : "",
      })),
    );
  }, [data?.results]);

  const filtered = rows.filter((r) => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!r.title.toLowerCase().includes(q) && !r.city.toLowerCase().includes(q) && !r.full_address.toLowerCase().includes(q))
        return false;
    }
    if (activeStatus === "available" && !r.is_available) return false;
    if (activeStatus === "unavailable" && r.is_available) return false;
    if (activeStatus === "approved" && !r.is_approved) return false;
    if (activeStatus === "pending_review" && r.is_approved) return false;
    if (advFilters.is_available && !r.is_available) return false;
    if (advFilters.is_approved && !r.is_approved) return false;
    if (advFilters.room_type && r.room_type !== advFilters.room_type) return false;
    return true;
  });

  const toPayload = (e: Partial<Row> & ReturnType<typeof emptyRow>, excludeOwner = false) => {
    const payload: Record<string, any> = {
      title: e.title,
      description: e.description || "",
      full_address: e.full_address || "",
      latitude: e.latitude,
      longitude: e.longitude,
      city: e.city || "",
      area: e.area || "",
      room_type: e.room_type,
      floor: e.floor ? parseInt(e.floor, 10) : null,
      total_floors: e.total_floors ? parseInt(e.total_floors, 10) : null,
      bedrooms: Number(e.bedrooms) || 1,
      bathrooms: Number(e.bathrooms) || 1,
      monthly_rent: e.monthly_rent ? parseFloat(e.monthly_rent) : 0,
      advance_months: Number(e.advance_months) || 2,
      is_furnished: Boolean(e.is_furnished),
      has_parking: Boolean(e.has_parking),
      has_wifi: Boolean(e.has_wifi),
      has_water: Boolean(e.has_water),
      has_electricity: Boolean(e.has_electricity),
      allowed_gender: e.allowed_gender,
      is_available: Boolean(e.is_available),
      is_approved: Boolean(e.is_approved),
      service_charge_type: e.service_charge_type,
      service_charge_value: e.service_charge_value ? parseFloat(e.service_charge_value) : 0,
    };
    if (!excludeOwner && e.owner_id) payload.owner = e.owner_id;
    return payload;
  };

  const handleSave = () => {
    if (!editing.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!isEditing && !editing.owner_id) {
      toast.error("Owner is required");
      return;
    }
    const { owner_name, views_count, created_at, ...rest } = editing as any;
    if (isEditing && (editing as any).id) {
      updateMutation.mutate(
        { id: (editing as any).id, data: toPayload(rest, true) },
        { onSuccess: () => { toast.success("Listing updated"); setFormOpen(false); } },
      );
    } else {
      createMutation.mutate(toPayload(rest, false), {
        onSuccess: () => { toast.success("Listing created"); setFormOpen(false); },
      });
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSuccess: () => {
          toast.success("Deleted");
          setDeleteOpen(false);
          setDeleteTarget(null);
          if (selected?.id === deleteTarget.id) {
            setDrawerOpen(false);
            setSelected(null);
          }
        },
      });
    }
  };

  return (
    <>
      <ModulePage
        title="Room Listings"
        subtitle="Manage room listings"
        createLabel="Add Listing"
        onCreate={() => {
          setEditing(emptyRow());
          setIsEditing(false);
          setFormOpen(true);
        }}
        onRowClick={(r) => {
          setSelected(r);
          setDrawerOpen(true);
        }}
        stats={[
          { label: "Total", value: statsData?.total ?? rows.length },
          { label: "Available", value: statsData?.bool_counts.is_available ?? rows.filter((r) => r.is_available).length },
          { label: "Approved", value: statsData?.bool_counts.is_approved ?? rows.filter((r) => r.is_approved).length },
          { label: "Pending", value: rows.filter((r) => !r.is_approved).length },
          { label: "Avg rent", value: statsData?.avg_amount != null ? `Rs. ${statsData.avg_amount}` : "—" },
          { label: "New today", value: statsData?.today ?? 0 },
        ]}
        statusFilters={[
          { label: "All", value: "all" },
          { label: "Available", value: "available" },
          { label: "Unavailable", value: "unavailable" },
          { label: "Approved", value: "approved" },
          { label: "Pending review", value: "pending_review" },
        ]}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        onSearch={setSearchQ}
        searchPlaceholder="Search title, city, address…"
        columns={[
          { key: "title", label: "Title", render: (r: Row) => <span className="font-medium">{r.title}</span> },
          { key: "owner_name", label: "Owner" },
          { key: "city", label: "City" },
          { key: "room_type", label: "Type", render: (r: Row) => <span className="capitalize">{r.room_type}</span> },
          {
            key: "monthly_rent",
            label: "Rent",
            render: (r: Row) => <span className="font-mono text-xs">{r.monthly_rent ? `Rs. ${r.monthly_rent}` : "—"}</span>,
          },
          { key: "is_available", label: "Avail.", render: (r: Row) => <StatusBadge status={r.is_available ? "online" : "offline"} /> },
          { key: "is_approved", label: "Approved", render: (r: Row) => <StatusBadge status={r.is_approved ? "approved" : "pending"} /> },
        ]}
        data={filtered}
        advancedFilterFields={advFilterFields}
        advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters}
        onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.title || ""} subtitle={selected?.id}>
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditing({ ...selected });
                  setIsEditing(true);
                  setFormOpen(true);
                  setDrawerOpen(false);
                }}
              >
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <p className="col-span-2"><span className="text-muted-foreground">Address</span><br />{selected.full_address}</p>
              <p><span className="text-muted-foreground">Rent</span><br />Rs. {selected.monthly_rent}</p>
              <p><span className="text-muted-foreground">Views</span><br />{selected.views_count}</p>
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit listing" : "Add listing"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <EntitySearchField
              resource="room_owners"
              labelKey="full_name"
              secondaryKey="phone"
              value={editing.owner_id || ""}
              displayName={editing.owner_name || ""}
              onChange={(id, label) => setEditing((p) => ({ ...p, owner_id: id, owner_name: label }))}
              label="Owner"
              required
              disabled={isEditing}
            />
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={editing.title} onChange={(e) => setEditing((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={editing.description} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Full address</Label>
              <Textarea value={editing.full_address} onChange={(e) => setEditing((p) => ({ ...p, full_address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={editing.city} onChange={(e) => setEditing((p) => ({ ...p, city: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Area</Label>
                <Input value={editing.area} onChange={(e) => setEditing((p) => ({ ...p, area: e.target.value }))} />
              </div>
            </div>
            <MapPickerField
              label="Location"
              latitude={editing.latitude ?? 27.7172}
              longitude={editing.longitude ?? 85.324}
              onLocationChange={(lat, lng) => setEditing((p) => ({ ...p, latitude: lat, longitude: lng }))}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Room type</Label>
                <Select value={editing.room_type} onValueChange={(v) => setEditing((p) => ({ ...p, room_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Bedrooms</Label>
                <Input type="number" min={1} value={editing.bedrooms} onChange={(e) => setEditing((p) => ({ ...p, bedrooms: parseInt(e.target.value, 10) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Bathrooms</Label>
                <Input type="number" min={1} value={editing.bathrooms} onChange={(e) => setEditing((p) => ({ ...p, bathrooms: parseInt(e.target.value, 10) || 1 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Floor</Label>
                <Input value={editing.floor} onChange={(e) => setEditing((p) => ({ ...p, floor: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Total floors</Label>
                <Input value={editing.total_floors} onChange={(e) => setEditing((p) => ({ ...p, total_floors: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly rent (Rs)</Label>
                <Input type="number" value={editing.monthly_rent} onChange={(e) => setEditing((p) => ({ ...p, monthly_rent: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Advance months</Label>
                <Input type="number" min={0} value={editing.advance_months} onChange={(e) => setEditing((p) => ({ ...p, advance_months: parseInt(e.target.value, 10) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Allowed gender</Label>
                <Select value={editing.allowed_gender} onValueChange={(v) => setEditing((p) => ({ ...p, allowed_gender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Service charge type</Label>
                <Select value={editing.service_charge_type} onValueChange={(v) => setEditing((p) => ({ ...p, service_charge_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SVC_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Service charge value</Label>
                <Input type="number" value={editing.service_charge_value} onChange={(e) => setEditing((p) => ({ ...p, service_charge_value: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  ["Furnished", "is_furnished"],
                  ["Parking", "has_parking"],
                  ["WiFi", "has_wifi"],
                  ["Water", "has_water"],
                  ["Electricity", "has_electricity"],
                  ["Available", "is_available"],
                  ["Approved", "is_approved"],
                ] as const
              ).map(([label, key]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                  <Label>{label}</Label>
                  <Switch checked={Boolean((editing as any)[key])} onCheckedChange={(v) => setEditing((p) => ({ ...p, [key]: v }))} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isEditing ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete listing"
        description={`Delete "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
