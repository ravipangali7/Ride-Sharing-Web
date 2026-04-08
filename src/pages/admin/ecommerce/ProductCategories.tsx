import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EntitySearchField } from "@/components/admin/EntitySearchField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminStats } from "@/lib/api";

interface CatRow {
  id: string;
  name: string;
  parent_id: string;
  parent_name: string;
}

const emptyCat: Omit<CatRow, "id"> = { name: "", parent_id: "", parent_name: "" };

export default function ProductCategoriesAdmin() {
  const [rows, setRows] = useState<CatRow[]>([]);
  const { data } = useAdminResource<any>("product_categories", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "product_categories"],
    queryFn: () => fetchAdminStats("product_categories"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useCreateResource("product_categories");
  const updateMutation = useUpdateResource("product_categories");
  const deleteMutation = useDeleteResource("product_categories");
  const [selected, setSelected] = useState<CatRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CatRow> & typeof emptyCat>(emptyCat);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CatRow | null>(null);
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    if (!data?.results) return;
    setRows(
      data.results.map((c: any) => ({
        id: c.id,
        name: c.name || "",
        parent_id: c.parent || "",
        parent_name: c.parent_name || "",
      })),
    );
  }, [data?.results]);

  const filtered = rows.filter((c) => {
    if (searchQ && !c.name.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const handleSave = () => {
    if (!editing.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    const { parent_name, ...rest } = editing as any;
    const payload: Record<string, any> = {
      name: rest.name,
      parent: rest.parent_id || null,
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate(
        { id: (editing as any).id, data: payload },
        { onSuccess: () => { toast.success("Category updated"); setFormOpen(false); } },
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
        title="Product Categories"
        subtitle="Manage ecommerce category tree"
        createLabel="Add Category"
        onCreate={() => {
          setEditing({ ...emptyCat });
          setIsEditing(false);
          setFormOpen(true);
        }}
        onRowClick={(r) => {
          setSelected(r);
          setDrawerOpen(true);
        }}
        stats={[
          { label: "Total", value: statsData?.total ?? rows.length },
          { label: "New today", value: statsData?.today ?? 0 },
          { label: "Root", value: rows.filter((c) => !c.parent_id).length },
          { label: "Child", value: rows.filter((c) => c.parent_id).length },
          { label: "—", value: "—" },
          { label: "—", value: "—" },
        ]}
        onSearch={setSearchQ}
        searchPlaceholder="Search category name…"
        columns={[
          { key: "name", label: "Name", render: (r: CatRow) => <span className="font-medium">{r.name}</span> },
          { key: "parent_name", label: "Parent", render: (r: CatRow) => r.parent_name || "—" },
        ]}
        data={filtered}
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
              <div>
                <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Parent</span>
                <p className="text-sm font-medium">{selected.parent_name || "—"}</p>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Name *</Label>
              <Input value={editing.name} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <EntitySearchField
              resource="product_categories"
              labelKey="name"
              value={editing.parent_id || ""}
              displayName={editing.parent_name || ""}
              onChange={(id, label) => setEditing((p) => ({ ...p, parent_id: id, parent_name: label }))}
              label="Parent category"
              placeholder="Optional — top-level if empty"
            />
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
        description={`Delete "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
