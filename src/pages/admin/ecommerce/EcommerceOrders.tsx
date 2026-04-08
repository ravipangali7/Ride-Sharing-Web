import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminResource, fetchAdminStats } from "@/lib/api";
import { MapPickerField } from "@/components/admin/MapPickerField";

const STATUS_OPTIONS = ["pending", "confirmed", "packed", "picked_up", "delivered", "cancelled"] as const;
const PAYMENT_OPTIONS = [
  { v: "cash_on_delivery", l: "Cash on delivery" },
  { v: "wallet", l: "Wallet" },
  { v: "qr_esewa", l: "QR eSewa" },
  { v: "qr_khalti", l: "QR Khalti" },
  { v: "qr_ime", l: "QR IME" },
] as const;

interface OrderRow {
  id: string;
  customer: string;
  customer_id: string;
  vendor: string;
  vendor_id: string;
  items_count: number;
  subtotal: string;
  delivery_charge: string;
  total_amount: string;
  status: string;
  payment_method: string;
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  note: string;
  created_at: string;
}

const emptyEdit = {
  status: "pending" as string,
  payment_method: "cash_on_delivery",
  note: "",
  delivery_address: "",
  delivery_latitude: 27.7172,
  delivery_longitude: 85.324,
};

export default function EcommerceOrdersAdmin() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const { data } = useAdminResource<any>("ecommerce_orders", { page_size: 200 });
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "ecommerce_orders"],
    queryFn: () => fetchAdminStats("ecommerce_orders"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const updateMutation = useUpdateResource("ecommerce_orders");
  const deleteMutation = useDeleteResource("ecommerce_orders");
  const [selected, setSelected] = useState<OrderRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<OrderRow> & typeof emptyEdit>(emptyEdit);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OrderRow | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const { data: lineItemsData, isLoading: lineItemsLoading } = useQuery({
    queryKey: ["admin-resource", "ecommerce_order_items", selected?.id],
    queryFn: () =>
      fetchAdminResource<Record<string, unknown>>("ecommerce_order_items", {
        order: selected!.id,
        page_size: 100,
      }),
    enabled: Boolean(drawerOpen && selected?.id),
  });

  const advFilterFields: FilterField[] = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: STATUS_OPTIONS.map((s) => ({ label: s, value: s })),
    },
    {
      key: "payment_method",
      label: "Payment",
      type: "select",
      options: PAYMENT_OPTIONS.map((p) => ({ label: p.l, value: p.v })),
    },
  ];

  useEffect(() => {
    if (!data?.results) return;
    setRows(
      data.results.map((o: any) => ({
        id: o.id,
        customer: o.customer_full_name || "",
        customer_id: o.customer || "",
        vendor: o.vendor_store_name || "",
        vendor_id: o.vendor || "",
        items_count: Number(o.items_count ?? 0),
        subtotal: o.subtotal != null ? String(o.subtotal) : "",
        delivery_charge: o.delivery_charge != null ? String(o.delivery_charge) : "",
        total_amount: o.total_amount != null ? String(o.total_amount) : "",
        status: o.status || "pending",
        payment_method: o.payment_method || "cash_on_delivery",
        delivery_address: o.delivery_address || "",
        delivery_latitude: Number(o.delivery_latitude) || 27.7172,
        delivery_longitude: Number(o.delivery_longitude) || 85.324,
        note: o.note || "",
        created_at: o.created_at ? String(o.created_at).slice(0, 19).replace("T", " ") : "",
      })),
    );
  }, [data?.results]);

  const filtered = rows.filter((o) => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!o.id.toLowerCase().includes(q) && !o.customer.toLowerCase().includes(q) && !o.vendor.toLowerCase().includes(q))
        return false;
    }
    if (activeStatus !== "all" && o.status !== activeStatus) return false;
    if (advFilters.status && o.status !== advFilters.status) return false;
    if (advFilters.payment_method && o.payment_method !== advFilters.payment_method) return false;
    return true;
  });

  const openEdit = (o: OrderRow) => {
    setEditingId(o.id);
    setEditing({
      status: o.status,
      payment_method: o.payment_method,
      note: o.note,
      delivery_address: o.delivery_address,
      delivery_latitude: o.delivery_latitude,
      delivery_longitude: o.delivery_longitude,
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!editingId) return;
    const payload: Record<string, any> = {
      status: editing.status,
      payment_method: editing.payment_method,
      note: editing.note || "",
      delivery_address: editing.delivery_address || "",
      delivery_latitude: editing.delivery_latitude,
      delivery_longitude: editing.delivery_longitude,
    };
    updateMutation.mutate(
      { id: editingId, data: payload },
      { onSuccess: () => { toast.success("Order updated"); setFormOpen(false); setEditingId(null); } },
    );
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

  const activeOrderCount = statsData?.by_status
    ? ["pending", "confirmed", "packed", "picked_up"].reduce((a, s) => a + (statsData.by_status[s] || 0), 0)
    : rows.filter((o) => ["pending", "confirmed", "packed", "picked_up"].includes(o.status)).length;

  return (
    <>
      <ModulePage
        title="Ecommerce Orders"
        subtitle="Monitor and update order status"
        onRowClick={(r) => {
          setSelected(r);
          setDrawerOpen(true);
        }}
        stats={[
          { label: "Total", value: statsData?.total ?? rows.length },
          { label: "Active", value: activeOrderCount, pulse: true },
          { label: "Delivered", value: statsData?.by_status.delivered ?? rows.filter((o) => o.status === "delivered").length },
          { label: "Cancelled", value: statsData?.by_status.cancelled ?? rows.filter((o) => o.status === "cancelled").length },
          { label: "Revenue today", value: statsData?.today_amount != null ? `Rs. ${Math.round(statsData.today_amount)}` : "—" },
          { label: "New today", value: statsData?.today ?? 0 },
        ]}
        statusFilters={[
          { label: "All", value: "all" },
          ...STATUS_OPTIONS.map((s) => ({ label: s.replace(/_/g, " "), value: s })),
        ]}
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        onSearch={setSearchQ}
        searchPlaceholder="Search ID, customer, vendor…"
        columns={[
          { key: "id", label: "ID", render: (r: OrderRow) => <span className="font-mono text-xs">{r.id}</span> },
          { key: "customer", label: "Customer" },
          { key: "vendor", label: "Vendor" },
          { key: "items_count", label: "Items" },
          {
            key: "total_amount",
            label: "Total",
            render: (r: OrderRow) => <span className="font-mono text-xs">{r.total_amount ? `Rs. ${r.total_amount}` : "—"}</span>,
          },
          { key: "status", label: "Status", render: (r: OrderRow) => <StatusBadge status={r.status} /> },
          {
            key: "payment_method",
            label: "Payment",
            render: (r: OrderRow) => <span className="text-xs capitalize">{r.payment_method.replace(/_/g, " ")}</span>,
          },
          { key: "created_at", label: "Created" },
        ]}
        data={filtered}
        advancedFilterFields={advFilterFields}
        advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters}
        onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected?.id || ""} subtitle={`${selected?.customer} — ${selected?.vendor}`}>
        {selected && (
          <div className="space-y-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">Line items</span>
              <div className="mt-2 rounded-md border divide-y max-h-48 overflow-y-auto">
                {lineItemsLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">Loading items…</p>
                ) : (lineItemsData?.results ?? []).length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No line items</p>
                ) : (
                  (lineItemsData?.results ?? []).map((row: any) => (
                    <div key={row.id} className="flex justify-between gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">{row.product_name || row.product || "Product"}</span>
                      <span className="shrink-0 font-mono text-xs">
                        Rs. {row.unit_price} × {row.quantity} = Rs. {row.total_price}
                      </span>
                    </div>
                  ))
                )}
              </div>
              {(() => {
                const rows = lineItemsData?.results ?? [];
                if (lineItemsLoading || rows.length === 0) return null;
                const sum = rows.reduce((s: number, r: any) => s + Number(r.total_price ?? 0), 0);
                const sub = Number(selected.subtotal);
                const ok = Number.isFinite(sub) && Math.abs(sum - sub) < 0.02;
                return (
                  <p className={`mt-2 text-xs ${ok ? "text-muted-foreground" : "text-amber-600 font-medium"}`}>
                    Sum of lines: Rs. {sum.toFixed(2)}
                    {ok ? " (matches subtotal)" : " — differs from order subtotal; check pricing or manual edits"}
                  </p>
                );
              })()}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { openEdit(selected); setDrawerOpen(false); }}>
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  ["Customer", selected.customer],
                  ["Vendor", selected.vendor],
                  ["Items", String(selected.items_count)],
                  ["Subtotal", selected.subtotal ? `Rs. ${selected.subtotal}` : "—"],
                  ["Delivery", selected.delivery_charge ? `Rs. ${selected.delivery_charge}` : "—"],
                  ["Total", selected.total_amount ? `Rs. ${selected.total_amount}` : "—"],
                  ["Status", selected.status],
                  ["Payment", selected.payment_method],
                  ["Address", selected.delivery_address],
                  ["Note", selected.note],
                  ["Created", selected.created_at],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className={k === "Address" || k === "Note" ? "col-span-2" : ""}>
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
            <DialogTitle>Edit ecommerce order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Status</Label>
              <Select value={editing.status} onValueChange={(v) => setEditing((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Payment method</Label>
              <Select value={editing.payment_method} onValueChange={(v) => setEditing((p) => ({ ...p, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((p) => (
                    <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Delivery address</Label>
              <Textarea value={editing.delivery_address} onChange={(e) => setEditing((p) => ({ ...p, delivery_address: e.target.value }))} />
            </div>
            <MapPickerField
              label="Delivery location"
              latitude={editing.delivery_latitude ?? 27.7172}
              longitude={editing.delivery_longitude ?? 85.324}
              onLocationChange={(lat, lng) => setEditing((p) => ({ ...p, delivery_latitude: lat, delivery_longitude: lng }))}
            />
            <div className="space-y-1.5">
              <Label className="text-sm">Note</Label>
              <Textarea value={editing.note} onChange={(e) => setEditing((p) => ({ ...p, note: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete order"
        description={`Delete order ${deleteTarget?.id}?`}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
