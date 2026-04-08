import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { UserSearchField } from "@/components/admin/UserSearchField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminStats } from "@/lib/api";

interface Row {
  id: string;
  user_id: string;
  user_display: string;
  full_name: string;
  phone: string;
  is_verified: boolean;
  created_at: string;
}

const empty: Omit<Row, "id" | "created_at"> = {
  user_id: "",
  user_display: "",
  full_name: "",
  phone: "",
  is_verified: false,
};

export default function RoomOwnersAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const { data } = useAdminResource<any>("room_owners", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "room_owners"],
    queryFn: () => fetchAdminStats("room_owners"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useCreateResource("room_owners");
  const updateMutation = useUpdateResource("room_owners");
  const deleteMutation = useDeleteResource("room_owners");
  const [selected, setSelected] = useState<Row | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Row> & typeof empty>(empty);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => {
    if (!data?.results) return;
    setRows(
      data.results.map((o: any) => ({
        id: o.id,
        user_id: o.user || "",
        user_display: o.user_full_name || "",
        full_name: o.full_name || "",
        phone: o.phone || "",
        is_verified: Boolean(o.is_verified),
        created_at: o.created_at ? String(o.created_at).slice(0, 10) : "",
      })),
    );
  }, [data?.results]);

  const filtered = rows.filter((r) => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!r.full_name.toLowerCase().includes(q) && !r.phone.includes(q) && !r.user_display.toLowerCase().includes(q))
        return false;
    }
    if (activeStatus === "verified" && !r.is_verified) return false;
    if (activeStatus === "unverified" && r.is_verified) return false;
    return true;
  });

  const handleSave = () => {
    if (!editing.full_name?.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!editing.phone?.trim()) {
      toast.error("Phone is required");
      return;
    }
    if (!isEditing && !editing.user_id) {
      toast.error("User is required");
      return;
    }
    const { user_display, created_at, ...rest } = editing as any;
    const payload: Record<string, any> = {
      full_name: rest.full_name,
      phone: rest.phone,
      is_verified: Boolean(rest.is_verified),
    };
    if (!isEditing) payload.user = rest.user_id;
    if (isEditing && (editing as any).id) {
      updateMutation.mutate(
        { id: (editing as any).id, data: payload },
        { onSuccess: () => { toast.success("Owner updated"); setFormOpen(false); } },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Owner created"); setFormOpen(false); } });
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
        title="Room Owners"
        subtitle="Manage room owner profiles"
        createLabel="Add Owner"
        onCreate={() => {
          setEditing({ ...empty });
          setIsEditing(false);
          setFormOpen(true);
        }}
        onRowClick={(r) => {
          setSelected(r);
          setDrawerOpen(true);
        }}
        stats={[
          { label: "Total", value: statsData?.total ?? rows.length },
          { label: "Verified", value: statsData?.bool_counts.is_verified ?? rows.filter((r) => r.is_verified).length },
          { label: "Pending", value: rows.filter((r) => !r.is_verified).length },
          { label: "New today", value: statsData?.today ?? 0 },
          { label: "—", value: "—" },
          { label: "—", value: "—" },
        ]}
        statusFilters={[
          { label: "All", value: "all" },
          { label: "Verified", value: "verified" },
          { label: "Unverified", value: "unverified" },
        ]}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        onSearch={setSearchQ}
        searchPlaceholder="Search name, phone…"
        columns={[
          { key: "full_name", label: "Name", render: (r: Row) => <span className="font-medium">{r.full_name}</span> },
          { key: "phone", label: "Phone" },
          { key: "user_display", label: "Linked user" },
          { key: "is_verified", label: "Verified", render: (r: Row) => <StatusBadge status={r.is_verified ? "approved" : "pending"} /> },
        ]}
        data={filtered}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.full_name || ""} subtitle={selected?.id}>
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
                  ["Linked user", selected.user_display],
                  ["Phone", selected.phone],
                  ["Verified", selected.is_verified ? "Yes" : "No"],
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit owner" : "Add owner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <UserSearchField
              value={editing.user_id || ""}
              displayName={editing.user_display || ""}
              onChange={(id, name) => setEditing((p) => ({ ...p, user_id: id, user_display: name }))}
              disabled={isEditing}
              label="Platform user"
            />
            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input value={editing.full_name} onChange={(e) => setEditing((p) => ({ ...p, full_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input value={editing.phone} onChange={(e) => setEditing((p) => ({ ...p, phone: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border">
              <Label>Verified</Label>
              <Switch checked={editing.is_verified} onCheckedChange={(v) => setEditing((p) => ({ ...p, is_verified: v }))} />
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
        title="Delete owner"
        description={`Delete "${deleteTarget?.full_name}"?`}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
