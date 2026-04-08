import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
import { EntitySearchField } from "@/components/admin/EntitySearchField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminStats } from "@/lib/api";

interface FoodCategoryRow {
  id: string;
  name: string;
  order: string;
  restaurant: string;
  restaurant_id: string;
}

const emptyRow: Omit<FoodCategoryRow, "id"> = {
  name: "",
  order: "0",
  restaurant: "",
  restaurant_id: "",
};

const advFilterFields: FilterField[] = [
  { key: "restaurant", label: "Restaurant name contains", type: "text" },
];

export default function FoodCategories() {
  const [items, setItems] = useState<FoodCategoryRow[]>([]);
  const { data } = useAdminResource<any>("food_categories", { page_size: 300, ordering: "order" });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "food_categories"],
    queryFn: () => fetchAdminStats("food_categories"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useCreateResource("food_categories");
  const updateMutation = useUpdateResource("food_categories");
  const deleteMutation = useDeleteResource("food_categories");
  const [selected, setSelected] = useState<FoodCategoryRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<FoodCategoryRow> & typeof emptyRow>(emptyRow);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FoodCategoryRow | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    if (!data?.results) return;
    setItems(
      data.results.map((c: any) => ({
        id: c.id,
        name: c.name || "",
        order: c.order != null ? String(c.order) : "0",
        restaurant: c.restaurant_name || "",
        restaurant_id: c.restaurant || "",
      }))
    );
  }, [data?.results]);

  const filtered = items.filter(c => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!c.name.toLowerCase().includes(q) && !c.restaurant.toLowerCase().includes(q)) return false;
    }
    if (advFilters.restaurant && !c.restaurant.toLowerCase().includes(advFilters.restaurant.toLowerCase())) return false;
    return true;
  });

  const handleCreate = () => {
    setEditing({ ...emptyRow });
    setIsEditing(false);
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!editing.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editing.restaurant_id) {
      toast.error("Restaurant is required");
      return;
    }
    const ord = parseInt(String(editing.order), 10);
    if (Number.isNaN(ord) || ord < 0) {
      toast.error("Order must be a non-negative integer");
      return;
    }
    const payload: Record<string, any> = {
      restaurant: editing.restaurant_id,
      name: editing.name.trim(),
      order: ord,
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate(
        { id: (editing as any).id, data: payload },
        { onSuccess: () => { toast.success("Category updated"); setFormOpen(false); } }
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Category created"); setFormOpen(false); } });
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
        title="Food categories"
        subtitle="Menu sections per restaurant"
        createLabel="Add category"
        onCreate={handleCreate}
        onRowClick={(c: FoodCategoryRow) => { setSelected(c); setDrawerOpen(true); }}
        stats={[
          { label: "Total", value: statsData?.total ?? items.length },
          { label: "Restaurants", value: new Set(items.map(i => i.restaurant_id)).size },
          { label: "New Today", value: statsData?.today ?? 0 },
        ]}
        searchPlaceholder="Search category or restaurant..."
        columns={[
          { key: "name", label: "Category", render: (r: FoodCategoryRow) => <span className="font-medium">{r.name}</span> },
          { key: "restaurant", label: "Restaurant" },
          { key: "order", label: "Sort order", render: (r: FoodCategoryRow) => <span className="font-mono">{r.order}</span> },
        ]}
        data={filtered}
        onSearch={setSearchQ}
        advancedFilterFields={advFilterFields}
        advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters}
        onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.name || ""} subtitle={selected?.restaurant}>
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                setEditing({ ...selected });
                setIsEditing(true);
                setFormOpen(true);
                setDrawerOpen(false);
              }}>
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["Name", selected.name],
                ["Restaurant", selected.restaurant],
                ["Sort order", selected.order],
                ["ID", selected.id],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}>
                  <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{k}</span>
                  <p className="text-sm font-medium break-all">{v || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditing ? "Edit category" : "Add category"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Name *</Label>
              <Input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
            </div>
            <EntitySearchField
              resource="restaurants"
              labelKey="name"
              secondaryKey="address"
              value={editing.restaurant_id}
              displayName={editing.restaurant}
              onChange={(id, name) => setEditing(p => ({ ...p, restaurant_id: id, restaurant: name }))}
              label="Restaurant"
              required
            />
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-sm">Display order</Label>
              <Input
                type="number"
                min={0}
                value={editing.order}
                onChange={e => setEditing(p => ({ ...p, order: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Lower numbers appear first in the customer menu.</p>
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
        title="Delete category"
        description={`Delete "${deleteTarget?.name}"? Menu items may still reference it.`}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
