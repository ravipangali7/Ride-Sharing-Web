import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { UserSearchField } from "@/components/admin/UserSearchField";
import { EntitySearchField } from "@/components/admin/EntitySearchField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminStats } from "@/lib/api";

const STATUSES = ["pending", "replied", "closed"] as const;

interface Row {
  id: string;
  room_id: string;
  room_title: string;
  customer_id: string;
  customer_name: string;
  message: string;
  status: string;
  created_at: string;
}

const empty: Omit<Row, "id" | "created_at"> = {
  room_id: "",
  room_title: "",
  customer_id: "",
  customer_name: "",
  message: "",
  status: "pending",
};

export default function RoomInquiriesAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const { data } = useAdminResource<any>("room_inquiries", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "room_inquiries"],
    queryFn: () => fetchAdminStats("room_inquiries"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useCreateResource("room_inquiries");
  const updateMutation = useUpdateResource("room_inquiries");
  const deleteMutation = useDeleteResource("room_inquiries");
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
      data.results.map((r: any) => ({
        id: r.id,
        room_id: r.room || "",
        room_title: r.room_title || "",
        customer_id: r.customer || "",
        customer_name: r.customer_full_name || "",
        message: r.message || "",
        status: r.status || "pending",
        created_at: r.created_at ? String(r.created_at).slice(0, 19).replace("T", " ") : "",
      })),
    );
  }, [data?.results]);

  const filtered = rows.filter((r) => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!r.message.toLowerCase().includes(q) && !r.room_title.toLowerCase().includes(q) && !r.customer_name.toLowerCase().includes(q))
        return false;
    }
    if (activeStatus !== "all" && r.status !== activeStatus) return false;
    return true;
  });

  const handleSave = () => {
    if (!editing.room_id) {
      toast.error("Room listing is required");
      return;
    }
    if (!editing.customer_id) {
      toast.error("Customer is required");
      return;
    }
    if (!editing.message?.trim()) {
      toast.error("Message is required");
      return;
    }
    const { room_title, customer_name, created_at, ...rest } = editing as any;
    const payload: Record<string, any> = {
      room: rest.room_id,
      customer: rest.customer_id,
      message: rest.message,
      status: rest.status || "pending",
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate(
        { id: (editing as any).id, data: payload },
        { onSuccess: () => { toast.success("Inquiry updated"); setFormOpen(false); } },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Inquiry created"); setFormOpen(false); } });
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
        title="Room Inquiries"
        subtitle="Customer inquiries on listings"
        createLabel="Add Inquiry"
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
          { label: "Pending", value: statsData?.by_status.pending ?? rows.filter((r) => r.status === "pending").length },
          { label: "Replied", value: statsData?.by_status.replied ?? rows.filter((r) => r.status === "replied").length },
          { label: "Closed", value: statsData?.by_status.closed ?? rows.filter((r) => r.status === "closed").length },
          { label: "New today", value: statsData?.today ?? 0 },
          { label: "—", value: "—" },
        ]}
        statusFilters={[
          { label: "All", value: "all" },
          ...STATUSES.map((s) => ({ label: s, value: s })),
        ]}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        onSearch={setSearchQ}
        searchPlaceholder="Search message, room, customer…"
        columns={[
          { key: "room_title", label: "Room" },
          { key: "customer_name", label: "Customer" },
          { key: "message", label: "Message", render: (r: Row) => <span className="max-w-[220px] truncate block">{r.message}</span> },
          { key: "status", label: "Status", render: (r: Row) => <StatusBadge status={r.status} /> },
          { key: "created_at", label: "Created" },
        ]}
        data={filtered}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.id || ""} subtitle={selected?.room_title}>
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
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Customer</span><br />{selected.customer_name}</p>
              <p><span className="text-muted-foreground">Message</span><br />{selected.message}</p>
              <p><span className="text-muted-foreground">Status</span><br />{selected.status}</p>
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit inquiry" : "Add inquiry"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <EntitySearchField
              resource="room_listings"
              labelKey="title"
              secondaryKey="city"
              value={editing.room_id || ""}
              displayName={editing.room_title || ""}
              onChange={(id, label) => setEditing((p) => ({ ...p, room_id: id, room_title: label }))}
              label="Room listing"
              required
              disabled={isEditing}
            />
            <UserSearchField
              value={editing.customer_id || ""}
              displayName={editing.customer_name || ""}
              onChange={(id, name) => setEditing((p) => ({ ...p, customer_id: id, customer_name: name }))}
              disabled={isEditing}
              label="Customer"
            />
            <div className="space-y-1.5">
              <Label>Message *</Label>
              <Textarea value={editing.message} onChange={(e) => setEditing((p) => ({ ...p, message: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editing.status} onValueChange={(v) => setEditing((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        title="Delete inquiry"
        description="This cannot be undone."
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
