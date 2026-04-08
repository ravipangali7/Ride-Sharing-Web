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

interface VendorRow {
  id: string;
  store_name: string;
  user_display: string;
  user_id: string;
  address: string;
  latitude: number;
  longitude: number;
  delivery_charge: string;
  is_approved: boolean;
  pan_number: string;
  vat_number: string;
  description: string;
  avg_rating: number;
  created_at: string;
}

const emptyVendor: Omit<VendorRow, "id" | "avg_rating" | "created_at"> = {
  store_name: "",
  user_display: "",
  user_id: "",
  address: "",
  latitude: 27.7172,
  longitude: 85.324,
  delivery_charge: "",
  is_approved: false,
  pan_number: "",
  vat_number: "",
  description: "",
};

const advFilterFields: FilterField[] = [
  { key: "is_approved", label: "Approved only", type: "boolean" },
];

export default function VendorsAdmin() {
  const [rows, setRows] = useState<VendorRow[]>([]);
  const { data } = useAdminResource<any>("vendors", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "vendors"],
    queryFn: () => fetchAdminStats("vendors"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useCreateResource("vendors");
  const updateMutation = useUpdateResource("vendors");
  const deleteMutation = useDeleteResource("vendors");
  const [selected, setSelected] = useState<VendorRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<VendorRow> & typeof emptyVendor>(emptyVendor);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VendorRow | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => {
    if (!data?.results) return;
    setRows(
      data.results.map((v: any) => ({
        id: v.id,
        store_name: v.store_name || "",
        user_display: v.user_full_name || "",
        user_id: v.user || "",
        address: v.address || "",
        latitude: Number(v.latitude) || 27.7172,
        longitude: Number(v.longitude) || 85.324,
        delivery_charge: v.delivery_charge != null ? String(v.delivery_charge) : "",
        is_approved: Boolean(v.is_approved),
        pan_number: v.pan_number || "",
        vat_number: v.vat_number || "",
        description: v.description || "",
        avg_rating: Number(v.avg_rating || 0),
        created_at: v.created_at ? String(v.created_at).slice(0, 10) : "",
      })),
    );
  }, [data?.results]);

  const filtered = rows.filter((v) => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (
        !v.store_name.toLowerCase().includes(q) &&
        !v.user_display.toLowerCase().includes(q) &&
        !v.id.toLowerCase().includes(q)
      )
        return false;
    }
    if (activeStatus === "approved" && !v.is_approved) return false;
    if (activeStatus === "pending" && v.is_approved) return false;
    if (advFilters.is_approved && !v.is_approved) return false;
    return true;
  });

  const handleSave = () => {
    if (!editing.store_name?.trim()) {
      toast.error("Store name is required");
      return;
    }
    if (!editing.user_id) {
      toast.error("User is required");
      return;
    }
    const { user_display, avg_rating, created_at, ...rest } = editing as any;
    const payload: Record<string, any> = {
      user: rest.user_id,
      store_name: rest.store_name,
      description: rest.description || "",
      address: rest.address || "",
      latitude: rest.latitude,
      longitude: rest.longitude,
      delivery_charge: rest.delivery_charge ? parseFloat(rest.delivery_charge) : 0,
      is_approved: Boolean(rest.is_approved),
      pan_number: rest.pan_number || "",
      vat_number: rest.vat_number || "",
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate(
        { id: (editing as any).id, data: payload },
        { onSuccess: () => { toast.success("Vendor updated"); setFormOpen(false); } },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Vendor created"); setFormOpen(false); } });
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
        title="Vendors"
        subtitle="Manage ecommerce vendors"
        createLabel="Add Vendor"
        onCreate={() => {
          setEditing({ ...emptyVendor });
          setIsEditing(false);
          setFormOpen(true);
        }}
        onRowClick={(r) => {
          setSelected(r);
          setDrawerOpen(true);
        }}
        stats={[
          { label: "Total", value: statsData?.total ?? rows.length },
          { label: "Approved", value: statsData?.bool_counts.is_approved ?? rows.filter((v) => v.is_approved).length },
          {
            label: "Pending",
            value: statsData
              ? statsData.total - (statsData.bool_counts.is_approved ?? 0)
              : rows.filter((v) => !v.is_approved).length,
          },
          { label: "New Today", value: statsData?.today ?? 0 },
          { label: "Avg Rating", value: rows.length ? (rows.reduce((s, v) => s + v.avg_rating, 0) / rows.length).toFixed(1) : "—" },
          { label: "Delivery (avg)", value: statsData?.avg_amount != null ? `Rs. ${statsData.avg_amount}` : "—" },
        ]}
        statusFilters={[
          { label: "All", value: "all" },
          { label: "Approved", value: "approved" },
          { label: "Pending", value: "pending" },
        ]}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        onSearch={setSearchQ}
        searchPlaceholder="Search store, owner, ID…"
        columns={[
          { key: "store_name", label: "Store", render: (r: VendorRow) => <span className="font-medium">{r.store_name}</span> },
          { key: "user_display", label: "Owner" },
          { key: "address", label: "Address", render: (r: VendorRow) => <span className="max-w-[200px] truncate block">{r.address}</span> },
          {
            key: "delivery_charge",
            label: "Delivery",
            render: (r: VendorRow) => <span className="font-mono text-xs">{r.delivery_charge ? `Rs. ${r.delivery_charge}` : "—"}</span>,
          },
          { key: "is_approved", label: "Approved", render: (r: VendorRow) => <StatusBadge status={r.is_approved ? "approved" : "pending"} /> },
          { key: "avg_rating", label: "Rating", render: (r: VendorRow) => `⭐ ${r.avg_rating.toFixed(1)}` },
        ]}
        data={filtered}
        advancedFilterFields={advFilterFields}
        advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters}
        onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.store_name || ""} subtitle={selected?.id}>
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
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  ["Store", selected.store_name],
                  ["Owner", selected.user_display],
                  ["Address", selected.address],
                  ["Lat / Lng", `${selected.latitude}, ${selected.longitude}`],
                  ["Delivery charge", selected.delivery_charge ? `Rs. ${selected.delivery_charge}` : "—"],
                  ["Approved", selected.is_approved ? "Yes" : "No"],
                  ["PAN", selected.pan_number],
                  ["VAT", selected.vat_number],
                  ["Description", selected.description],
                  ["Created", selected.created_at],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k}>
                  <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{k}</span>
                  <p className="text-sm font-medium">{v || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <UserSearchField
              value={editing.user_id || ""}
              displayName={editing.user_display || ""}
              onChange={(id, name) => setEditing((p) => ({ ...p, user_id: id, user_display: name }))}
              disabled={isEditing}
              label="Linked user"
            />
            <div className="space-y-1.5">
              <Label className="text-sm">Store name *</Label>
              <Input value={editing.store_name} onChange={(e) => setEditing((p) => ({ ...p, store_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea value={editing.description} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Address</Label>
              <Textarea value={editing.address} onChange={(e) => setEditing((p) => ({ ...p, address: e.target.value }))} />
            </div>
            <MapPickerField
              label="Store location"
              latitude={editing.latitude ?? 27.7172}
              longitude={editing.longitude ?? 85.324}
              onLocationChange={(lat, lng) => setEditing((p) => ({ ...p, latitude: lat, longitude: lng }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Delivery charge (Rs)</Label>
                <Input
                  type="number"
                  value={editing.delivery_charge}
                  onChange={(e) => setEditing((p) => ({ ...p, delivery_charge: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <Label>Approved</Label>
                <Switch checked={editing.is_approved} onCheckedChange={(v) => setEditing((p) => ({ ...p, is_approved: v }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">PAN</Label>
                <Input value={editing.pan_number} onChange={(e) => setEditing((p) => ({ ...p, pan_number: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">VAT</Label>
                <Input value={editing.vat_number} onChange={(e) => setEditing((p) => ({ ...p, vat_number: e.target.value }))} />
              </div>
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
        title="Delete vendor"
        description={`Delete "${deleteTarget?.store_name}"?`}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
