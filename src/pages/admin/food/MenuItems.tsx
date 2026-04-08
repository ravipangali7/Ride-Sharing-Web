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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminResource, fetchAdminStats } from "@/lib/api";

interface MenuItemData {
  id: string;
  name: string;
  restaurant: string;            // display name
  restaurant_id: string;         // FK UUID
  category: string;              // display name
  category_id: string;           // FK UUID (FoodCategory)
  price: number;                 // numeric
  is_veg: boolean;
  is_available: boolean;
  description: string;
  preparation_time_minutes: string;
}

const emptyMenuItem: Omit<MenuItemData, "id"> = {
  name: "", restaurant: "", restaurant_id: "", category: "", category_id: "",
  price: 0, is_veg: false, is_available: true, description: "", preparation_time_minutes: "15",
};

const advFilterFields: FilterField[] = [
  { key: "is_veg", label: "Veg Only", type: "boolean" },
  { key: "is_available", label: "Available Only", type: "boolean" },
  { key: "restaurant", label: "Restaurant", type: "text" },
];

export default function MenuItems() {
  const [items, setItems] = useState<MenuItemData[]>([]);
  const { data } = useAdminResource<any>("menu_items", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "menu_items"],
    queryFn: () => fetchAdminStats("menu_items"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const { data: categoriesData } = useQuery({
    queryKey: ["admin-resource", "food_categories"],
    queryFn: () => fetchAdminResource<any>("food_categories", { page_size: 100 }),
    staleTime: 60_000,
  });
  const categories: { id: string; name: string }[] = categoriesData?.results ?? [];

  const createMutation = useCreateResource("menu_items");
  const updateMutation = useUpdateResource("menu_items");
  const deleteMutation = useDeleteResource("menu_items");
  const [selected, setSelected] = useState<MenuItemData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<MenuItemData> & typeof emptyMenuItem>(emptyMenuItem);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MenuItemData | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    if (!data?.results) return;
    setItems(
      data.results.map((m: any) => ({
        id: m.id,
        name: m.name || "",
        restaurant: m.restaurant_name || "",
        restaurant_id: m.restaurant || "",
        category: m.category_name || "",
        category_id: m.category || "",
        price: Number(m.price || 0),
        is_veg: Boolean(m.is_veg),
        is_available: Boolean(m.is_available),
        description: m.description || "",
        preparation_time_minutes: m.preparation_time_minutes ? String(m.preparation_time_minutes) : "",
      }))
    );
  }, [data?.results]);

  const filtered = items.filter(m => {
    if (searchQ) { const q = searchQ.toLowerCase(); if (!m.name.toLowerCase().includes(q) && !m.restaurant.toLowerCase().includes(q)) return false; }
    if (advFilters.is_veg && !m.is_veg) return false;
    if (advFilters.is_available && !m.is_available) return false;
    if (advFilters.restaurant && !m.restaurant.toLowerCase().includes(advFilters.restaurant.toLowerCase())) return false;
    return true;
  });

  const handleCreate = () => { setEditing({ ...emptyMenuItem }); setIsEditing(false); setFormOpen(true); };
  const handleSave = () => {
    if (!editing.name) { toast.error("Name is required"); return; }
    if (!editing.restaurant_id) { toast.error("Restaurant is required"); return; }
    if (!editing.category_id) { toast.error("Category is required"); return; }
    const prep = parseInt(String(editing.preparation_time_minutes), 10);
    if (!prep || prep < 1) { toast.error("Prep time must be at least 1 minute"); return; }
    const payload: Record<string, any> = {
      name: editing.name,
      description: editing.description || "",
      restaurant: editing.restaurant_id,
      category: editing.category_id,
      price: Number(editing.price) || 0,
      preparation_time_minutes: prep,
      is_veg: Boolean(editing.is_veg),
      is_available: Boolean(editing.is_available),
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate({ id: (editing as any).id, data: payload }, { onSuccess: () => { toast.success("Item updated"); setFormOpen(false); } });
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Item created"); setFormOpen(false); } });
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
      <ModulePage title="Menu Items" subtitle="Browse all menu items" createLabel="Create New"
        onCreate={handleCreate} onRowClick={(m: MenuItemData) => { setSelected(m); setDrawerOpen(true); }}
        stats={[
          { label: "Total", value: statsData?.total ?? items.length },
          { label: "Available", value: statsData?.bool_counts.is_available ?? items.filter(m => m.is_available).length },
          { label: "Unavailable", value: statsData ? (statsData.total - (statsData.bool_counts.is_available ?? 0)) : items.filter(m => !m.is_available).length },
          { label: "Veg", value: statsData?.bool_counts.is_veg ?? items.filter(m => m.is_veg).length },
          { label: "New Today", value: statsData?.today ?? 0 },
          { label: "Avg Price", value: items.length > 0 ? `Rs. ${Math.floor(items.reduce((s, m) => s + m.price, 0) / items.length)}` : "—" },
        ]}
        searchPlaceholder="Search item, restaurant..." columns={[
          { key: "name", label: "Item", render: (r: MenuItemData) => <span className="font-medium">{r.name}</span> },
          { key: "restaurant", label: "Restaurant" }, { key: "category", label: "Category" },
          { key: "price", label: "Price", render: (r: MenuItemData) => <span className="font-mono">Rs. {r.price}</span> },
          { key: "is_veg", label: "Veg", render: (r: MenuItemData) => r.is_veg ? "🟢" : "🔴" },
          { key: "is_available", label: "Available", render: (r: MenuItemData) => <StatusBadge status={r.is_available ? "online" : "offline"} /> },
          { key: "preparation_time_minutes", label: "Prep Time", render: (r: MenuItemData) => r.preparation_time_minutes ? `${r.preparation_time_minutes} min` : "—" },
        ]} data={filtered} onSearch={setSearchQ}
        advancedFilterFields={advFilterFields} advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters} onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.name || ""} subtitle={selected?.restaurant}>
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing({ ...selected }); setIsEditing(true); setFormOpen(true); setDrawerOpen(false); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["Name", selected.name], ["Restaurant", selected.restaurant], ["Category", selected.category],
                ["Price", `Rs. ${selected.price}`], ["Veg", selected.is_veg ? "Yes" : "No"],
                ["Available", selected.is_available ? "Yes" : "No"],
                ["Prep Time", selected.preparation_time_minutes ? `${selected.preparation_time_minutes} min` : "—"],
                ["Description", selected.description],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}><span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{k}</span><p className="text-sm font-medium">{v || "—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditing ? "Edit Item" : "Create Item"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5"><Label className="text-sm">Name *</Label><Input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} /></div>
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
            <EntitySearchField
              resource="food_categories"
              labelKey="name"
              value={editing.category_id}
              displayName={editing.category}
              onChange={(id, name) => setEditing(p => ({ ...p, category_id: id, category: name }))}
              label="Category"
            />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-sm">Price (Rs) *</Label><Input type="number" value={String(editing.price)} onChange={e => setEditing(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="space-y-1.5"><Label className="text-sm">Prep Time (minutes)</Label><Input type="number" value={editing.preparation_time_minutes} onChange={e => setEditing(p => ({ ...p, preparation_time_minutes: e.target.value }))} /></div>
              <div className="flex items-center justify-between p-3 rounded-lg border"><Label>Veg</Label><Switch checked={editing.is_veg} onCheckedChange={v => setEditing(p => ({ ...p, is_veg: v }))} /></div>
              <div className="flex items-center justify-between p-3 rounded-lg border"><Label>Available</Label><Switch checked={editing.is_available} onCheckedChange={v => setEditing(p => ({ ...p, is_available: v }))} /></div>
              <div className="space-y-1.5 col-span-2"><Label className="text-sm">Description</Label><Textarea value={editing.description} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={handleSave}>{isEditing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Item" description={`Delete "${deleteTarget?.name}"?`} onConfirm={handleDelete} destructive />
    </>
  );
}
