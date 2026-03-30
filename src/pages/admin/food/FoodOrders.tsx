import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
import { UserSearchField } from "@/components/admin/UserSearchField";
import { EntitySearchField } from "@/components/admin/EntitySearchField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminStats } from "@/lib/api";

interface FoodOrderData {
  id: string;
  customer: string;           // display name
  customer_id: string;        // FK UUID
  restaurant: string;         // display name
  restaurant_id: string;      // FK UUID
  items_count: number;
  total_amount: string;
  delivery_charge: string;
  status: string;
  payment_method: string;
  special_instruction: string;
  created_at: string;
}

const emptyOrder: Omit<FoodOrderData, "id" | "created_at"> = {
  customer: "", customer_id: "",
  restaurant: "", restaurant_id: "",
  items_count: 1, total_amount: "", delivery_charge: "",
  status: "pending", payment_method: "cash", special_instruction: "",
};

const advFilterFields: FilterField[] = [
  { key: "status", label: "Status", type: "select", options: ["pending", "confirmed", "preparing", "ready", "picked_up", "delivered", "cancelled"].map(s => ({ label: s, value: s })) },
  { key: "payment_method", label: "Payment", type: "select", options: [
    { label: "Cash", value: "cash" }, { label: "Wallet", value: "wallet" },
    { label: "eSewa", value: "qr_esewa" }, { label: "Khalti", value: "qr_khalti" },
  ]},
  { key: "restaurant", label: "Restaurant", type: "text" },
];

export default function FoodOrders() {
  const [items, setItems] = useState<FoodOrderData[]>([]);
  const { data } = useAdminResource<any>("food_orders", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "food_orders"],
    queryFn: () => fetchAdminStats("food_orders"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const createMutation = useCreateResource("food_orders");
  const updateMutation = useUpdateResource("food_orders");
  const deleteMutation = useDeleteResource("food_orders");
  const [selected, setSelected] = useState<FoodOrderData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<FoodOrderData> & typeof emptyOrder>(emptyOrder);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FoodOrderData | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  useEffect(() => {
    if (!data?.results) return;
    setItems(
      data.results.map((o: any) => ({
        id: o.id,
        customer: o.customer_full_name || "",
        customer_id: o.customer || "",
        restaurant: o.restaurant_name || "",
        restaurant_id: o.restaurant || "",
        items_count: Number(o.items_count || 0),
        total_amount: o.total_amount ? String(o.total_amount) : "",
        delivery_charge: o.delivery_charge ? String(o.delivery_charge) : "",
        status: o.status || "pending",
        payment_method: o.payment_method || "cash",
        special_instruction: o.special_instruction || "",
        created_at: o.created_at ? String(o.created_at).slice(0, 19).replace("T", " ") : "",
      }))
    );
  }, [data?.results]);

  const filtered = items.filter(o => {
    if (searchQ) { const q = searchQ.toLowerCase(); if (!o.id.toLowerCase().includes(q) && !o.customer.toLowerCase().includes(q) && !o.restaurant.toLowerCase().includes(q)) return false; }
    if (activeStatus !== "all" && o.status !== activeStatus) return false;
    if (advFilters.status && o.status !== advFilters.status) return false;
    if (advFilters.payment_method && o.payment_method !== advFilters.payment_method) return false;
    if (advFilters.restaurant && !o.restaurant.toLowerCase().includes(advFilters.restaurant.toLowerCase())) return false;
    return true;
  });

  const handleCreate = () => { setEditing({ ...emptyOrder }); setIsEditing(false); setFormOpen(true); };
  const handleSave = () => {
    if (!editing.customer_id) { toast.error("Customer is required"); return; }
    if (!editing.restaurant_id) { toast.error("Restaurant is required"); return; }
    const { customer, customer_id, restaurant, restaurant_id, created_at, ...rest } = editing as any;
    const payload: Record<string, any> = {
      ...rest,
      customer: customer_id,
      restaurant: restaurant_id,
      total_amount: rest.total_amount ? parseFloat(rest.total_amount) : null,
      delivery_charge: rest.delivery_charge ? parseFloat(rest.delivery_charge) : null,
    };
    if (isEditing && (editing as any).id) {
      updateMutation.mutate({ id: (editing as any).id, data: payload }, { onSuccess: () => { toast.success("Order updated"); setFormOpen(false); } });
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Order created"); setFormOpen(false); } });
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
      <ModulePage title="Food Orders" subtitle="Monitor food orders" createLabel="Create New"
        onCreate={handleCreate} onRowClick={(o: FoodOrderData) => { setSelected(o); setDrawerOpen(true); }}
        stats={[
          { label: "Total", value: statsData?.total ?? items.length },
          { label: "Live", value: statsData ? ((statsData.by_status.confirmed || 0) + (statsData.by_status.preparing || 0) + (statsData.by_status.ready || 0)) : items.filter(o => ["confirmed", "preparing", "ready"].includes(o.status)).length, pulse: true },
          { label: "Delivered", value: statsData?.by_status.delivered ?? items.filter(o => o.status === "delivered").length },
          { label: "Cancelled", value: statsData?.by_status.cancelled ?? items.filter(o => o.status === "cancelled").length },
          { label: "New Today", value: statsData?.today ?? 0 },
          { label: "Pending", value: statsData?.by_status.pending ?? items.filter(o => o.status === "pending").length },
        ]}
        statusFilters={[{ label: "All", value: "all" }, { label: "Pending", value: "pending" }, { label: "Preparing", value: "preparing" }, { label: "Ready", value: "ready" }, { label: "Delivered", value: "delivered" }, { label: "Cancelled", value: "cancelled" }]}
        activeStatus={activeStatus} onStatusChange={setActiveStatus} onSearch={setSearchQ}
        searchPlaceholder="Search order ID, customer, restaurant..." columns={[
          { key: "id", label: "ID", render: (r: FoodOrderData) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "customer", label: "Customer" }, { key: "restaurant", label: "Restaurant" },
          { key: "items_count", label: "Items" },
          { key: "total_amount", label: "Total", render: (r: FoodOrderData) => <span className="font-mono">{r.total_amount ? `Rs. ${r.total_amount}` : "—"}</span> },
          { key: "delivery_charge", label: "Delivery", render: (r: FoodOrderData) => r.delivery_charge ? `Rs. ${r.delivery_charge}` : "—" },
          { key: "status", label: "Status", render: (r: FoodOrderData) => <StatusBadge status={r.status} /> },
          { key: "payment_method", label: "Payment", render: (r: FoodOrderData) => <Badge variant="secondary" className="text-[10px] capitalize">{r.payment_method.replace("_", " ")}</Badge> },
          { key: "created_at", label: "Created" },
        ]} data={filtered}
        advancedFilterFields={advFilterFields} advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters} onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.id || ""} subtitle={`${selected?.customer} — ${selected?.restaurant}`}>
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing({ ...selected }); setIsEditing(true); setFormOpen(true); setDrawerOpen(false); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                ["Customer", selected.customer], ["Restaurant", selected.restaurant],
                ["Items", String(selected.items_count)],
                ["Total", selected.total_amount ? `Rs. ${selected.total_amount}` : "—"],
                ["Delivery", selected.delivery_charge ? `Rs. ${selected.delivery_charge}` : "—"],
                ["Status", selected.status], ["Payment", selected.payment_method],
                ["Notes", selected.special_instruction], ["Created", selected.created_at],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k}><span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{k}</span><p className="text-sm font-medium">{v || "—"}</p></div>
              ))}
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditing ? "Edit Order" : "Create Order"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <UserSearchField
              value={editing.customer_id}
              displayName={editing.customer}
              onChange={(id, name) => setEditing(p => ({ ...p, customer_id: id, customer: name }))}
              disabled={isEditing}
              label="Customer"
            />
            <EntitySearchField
              resource="restaurants"
              labelKey="name"
              value={editing.restaurant_id}
              displayName={editing.restaurant}
              onChange={(id, name) => setEditing(p => ({ ...p, restaurant_id: id, restaurant: name }))}
              label="Restaurant"
              required
            />
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-sm">Total Amount (Rs)</Label><Input type="number" value={editing.total_amount} onChange={e => setEditing(p => ({ ...p, total_amount: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label className="text-sm">Delivery Charge (Rs)</Label><Input type="number" value={editing.delivery_charge} onChange={e => setEditing(p => ({ ...p, delivery_charge: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label className="text-sm">Payment Method</Label>
                <Select value={editing.payment_method} onValueChange={v => setEditing(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="wallet">Wallet</SelectItem>
                    <SelectItem value="qr_esewa">eSewa QR</SelectItem>
                    <SelectItem value="qr_khalti">Khalti QR</SelectItem>
                    <SelectItem value="qr_ime">IME Pay QR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Status</Label>
                <Select value={editing.status} onValueChange={v => setEditing(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["pending", "confirmed", "preparing", "ready", "picked_up", "delivered", "cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2"><Label className="text-sm">Special Instructions</Label><Input value={editing.special_instruction} onChange={e => setEditing(p => ({ ...p, special_instruction: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={handleSave}>{isEditing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Order" description={`Delete "${deleteTarget?.id}"?`} onConfirm={handleDelete} destructive />
    </>
  );
}
