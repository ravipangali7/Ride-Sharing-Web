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
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminStats } from "@/lib/api";

interface ProductRow {
  id: string;
  name: string;
  vendor_id: string;
  vendor_name: string;
  category_id: string;
  category_name: string;
  description: string;
  price: string;
  discounted_price: string;
  stock: number;
  sku: string;
  is_active: boolean;
  avg_rating: number;
  created_at: string;
}

const emptyProduct: Omit<ProductRow, "id" | "avg_rating" | "created_at"> = {
  name: "",
  vendor_id: "",
  vendor_name: "",
  category_id: "",
  category_name: "",
  description: "",
  price: "",
  discounted_price: "",
  stock: 0,
  sku: "",
  is_active: true,
};

const advFilterFields: FilterField[] = [
  { key: "is_active", label: "Active only", type: "boolean" },
  { key: "stock", label: "Min stock", type: "number" },
];

export default function ProductsAdmin() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const { data } = useAdminResource<any>("products", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "products"],
    queryFn: () => fetchAdminStats("products"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useCreateResource("products");
  const updateMutation = useUpdateResource("products");
  const deleteMutation = useDeleteResource("products");
  const [selected, setSelected] = useState<ProductRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ProductRow> & typeof emptyProduct>(emptyProduct);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductRow | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => {
    if (!data?.results) return;
    setRows(
      data.results.map((p: any) => ({
        id: p.id,
        name: p.name || "",
        vendor_id: p.vendor || "",
        vendor_name: p.vendor_store_name || "",
        category_id: p.category || "",
        category_name: p.category_name || "",
        description: p.description || "",
        price: p.price != null ? String(p.price) : "",
        discounted_price: p.discounted_price != null ? String(p.discounted_price) : "",
        stock: Number(p.stock ?? 0),
        sku: p.sku || "",
        is_active: p.is_active !== false,
        avg_rating: Number(p.avg_rating || 0),
        created_at: p.created_at ? String(p.created_at).slice(0, 10) : "",
      })),
    );
  }, [data?.results]);

  const filtered = rows.filter((p) => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q) && !p.vendor_name.toLowerCase().includes(q))
        return false;
    }
    if (activeStatus === "active" && !p.is_active) return false;
    if (activeStatus === "inactive" && p.is_active) return false;
    if (advFilters.is_active && !p.is_active) return false;
    if (advFilters.stock !== "" && advFilters.stock != null && p.stock < Number(advFilters.stock)) return false;
    return true;
  });

  const handleSave = () => {
    if (!editing.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editing.vendor_id) {
      toast.error("Vendor is required");
      return;
    }
    if (!editing.category_id) {
      toast.error("Category is required");
      return;
    }
    const { vendor_name, category_name, avg_rating, created_at, ...rest } = editing as any;
    const payload: Record<string, any> = {
      vendor: rest.vendor_id,
      category: rest.category_id,
      name: rest.name,
      description: rest.description || "",
      price: rest.price ? parseFloat(rest.price) : 0,
      discounted_price: rest.discounted_price ? parseFloat(rest.discounted_price) : null,
      stock: Number(rest.stock) || 0,
      sku: rest.sku || "",
      is_active: Boolean(rest.is_active),
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate(
        { id: (editing as any).id, data: payload },
        { onSuccess: () => { toast.success("Product updated"); setFormOpen(false); } },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Product created"); setFormOpen(false); } });
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
        title="Products"
        subtitle="Browse and manage products"
        createLabel="Add Product"
        onCreate={() => {
          setEditing({ ...emptyProduct });
          setIsEditing(false);
          setFormOpen(true);
        }}
        onRowClick={(r) => {
          setSelected(r);
          setDrawerOpen(true);
        }}
        stats={[
          { label: "Total", value: statsData?.total ?? rows.length },
          { label: "Active", value: statsData?.bool_counts.is_active ?? rows.filter((p) => p.is_active).length },
          {
            label: "In stock",
            value: statsData?.out_of_stock != null ? statsData.total - statsData.out_of_stock : rows.filter((p) => p.stock > 0).length,
          },
          { label: "Out of stock", value: statsData?.out_of_stock ?? rows.filter((p) => p.stock === 0).length },
          { label: "Avg price", value: statsData?.avg_amount != null ? `Rs. ${statsData.avg_amount}` : "—" },
          { label: "New today", value: statsData?.today ?? 0 },
        ]}
        statusFilters={[
          { label: "All", value: "all" },
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ]}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        onSearch={setSearchQ}
        searchPlaceholder="Search name, SKU, vendor…"
        columns={[
          { key: "name", label: "Product", render: (r: ProductRow) => <span className="font-medium">{r.name}</span> },
          { key: "vendor_name", label: "Vendor" },
          { key: "category_name", label: "Category" },
          { key: "price", label: "Price", render: (r: ProductRow) => <span className="font-mono text-xs">Rs. {r.price}</span> },
          { key: "stock", label: "Stock", render: (r: ProductRow) => <span className="font-mono">{r.stock}</span> },
          { key: "is_active", label: "Active", render: (r: ProductRow) => <StatusBadge status={r.is_active ? "online" : "offline"} /> },
        ]}
        data={filtered}
        advancedFilterFields={advFilterFields}
        advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters}
        onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.name || ""} subtitle={selected?.id}>
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
                  ["Vendor", selected.vendor_name],
                  ["Category", selected.category_name],
                  ["Price", `Rs. ${selected.price}`],
                  ["Discounted", selected.discounted_price ? `Rs. ${selected.discounted_price}` : "—"],
                  ["Stock", String(selected.stock)],
                  ["SKU", selected.sku],
                  ["Active", selected.is_active ? "Yes" : "No"],
                  ["Rating", selected.avg_rating.toFixed(1)],
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
            <DialogTitle>{isEditing ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <EntitySearchField
              resource="vendors"
              labelKey="store_name"
              secondaryKey="user_full_name"
              value={editing.vendor_id || ""}
              displayName={editing.vendor_name || ""}
              onChange={(id, label) => setEditing((p) => ({ ...p, vendor_id: id, vendor_name: label }))}
              label="Vendor"
              required
            />
            <EntitySearchField
              resource="product_categories"
              labelKey="name"
              value={editing.category_id || ""}
              displayName={editing.category_name || ""}
              onChange={(id, label) => setEditing((p) => ({ ...p, category_id: id, category_name: label }))}
              label="Category"
              required
            />
            <div className="space-y-1.5">
              <Label className="text-sm">Name *</Label>
              <Input value={editing.name} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea value={editing.description} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Price (Rs) *</Label>
                <Input type="number" value={editing.price} onChange={(e) => setEditing((p) => ({ ...p, price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Discounted (Rs)</Label>
                <Input type="number" value={editing.discounted_price} onChange={(e) => setEditing((p) => ({ ...p, discounted_price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Stock *</Label>
                <Input type="number" value={editing.stock} onChange={(e) => setEditing((p) => ({ ...p, stock: parseInt(e.target.value, 10) || 0 }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">SKU</Label>
                <Input value={editing.sku} onChange={(e) => setEditing((p) => ({ ...p, sku: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border col-span-2">
                <Label>Active</Label>
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing((p) => ({ ...p, is_active: v }))} />
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
        title="Delete product"
        description={`Delete "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
