import { useEffect, useMemo, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatsBar } from "@/components/admin/StatsBar";
import { FilterBar } from "@/components/admin/FilterBar";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, Column } from "@/components/admin/DataTable";
import { AdvancedFilterDialog, FilterField } from "@/components/admin/AdvancedFilterDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Edit, Trash2 } from "lucide-react";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { fetchAdminStats, ResourceStats } from "@/lib/api";

// ── Generic CRUD Page Builder ──
interface FieldDef { key: string; label: string; type?: "text" | "number" | "date" | "select" | "boolean" | "textarea"; options?: string[]; required?: boolean; }
interface CrudPageConfig<T> {
  title: string; subtitle: string; createLabel?: string;
  stats: { label: string; value: string | number; trend?: { value: string; up: boolean }; pulse?: boolean }[];
  columns: Column<T>[]; generateData: () => T[];
  resource?: string;
  formFields: FieldDef[]; idKey: string; idPrefix: string;
  statusFilters?: { label: string; value: string }[];
  statusKey?: string; searchKeys: string[];
  advFilterFields?: FilterField[];
}

const TITLE_TO_RESOURCE: Record<string, string> = {
  "Vendors": "vendors",
  "Products": "products",
  "Product Categories": "product_categories",
  "Ecommerce Orders": "ecommerce_orders",
  "Room Listings": "room_listings",
  "Room Owners": "room_owners",
  "Room Inquiries": "room_inquiries",
  "Booking Requests": "room_requests",
  "Wallets": "wallets",
  "Wallet Transactions": "wallet_transactions",
  "Payments": "payments",
  "Payment Intents": "payment_intents",
  "QR Payment Sessions": "qr_sessions",
  "Topup Requests": "topups",
  "Rider Payouts": "payouts",
  "Vehicle Types": "vehicle_types",
  "Surge Rules": "surge_rules",
  "Fare Overrides": "fare_overrides",
  "Fare Estimates": "fare_estimates",
  "Coin Rate": "coin_rates",
  "Promo Codes": "promo_codes",
  "Promo Usage": "promo_usage",
  "Birthday Promos": "birthday_promos",
  "Referral Rewards": "referrals",
  "Popup Ads": "popup_ads",
  "Loyalty Tiers": "loyalty_tiers",
  "User Loyalty Profiles": "loyalty_users",
  "Loyalty Transactions": "loyalty_transactions",
  "User Streaks": "streaks",
  "Achievements": "loyalty_achievements",
  "Trip Targets": "trip_targets",
  "Demand Forecasting": "demand_forecast",
  "Send Push Notification": "send_push",
  "Notification Templates": "notif_templates",
  "Push Logs": "push_logs",
  "Inbox": "notif_inbox",
  "Support Tickets": "support_tickets",
  "App Settings": "app_settings",
  "Service Charges": "service_charges",
  "App Versions": "app_versions",
  "Quick Replies": "quick_replies",
  "Cancellation Policies": "cancellation_policies",
  "Admin Users": "admin_users",
  "Activity Logs": "activity_logs",
  "Analytics & Reports": "analytics",
  "Rider Leaderboard": "rider_leaderboard",
  "Rider Achievements": "rider_achievements",
};

function _fmtAmount(v: number): string {
  if (v >= 1_000_000) return `Rs. ${(v / 1_000_000).toFixed(1)}L`;
  if (v >= 1_000) return `Rs. ${(v / 1_000).toFixed(1)}K`;
  return `Rs. ${Math.round(v)}`;
}

/** Map a config stat label to a live value from the ResourceStats payload. */
function _applyLiveStat(
  stat: CrudPageConfig<any>["stats"][0],
  liveStats: ResourceStats | undefined,
): CrudPageConfig<any>["stats"][0] {
  if (!liveStats) return stat;
  const lbl = stat.label.toLowerCase().trim();

  // Total / Count
  if (lbl === "total" || lbl.startsWith("total ") || lbl === "count") {
    return { ...stat, value: liveStats.total };
  }
  // Today counts
  if (lbl === "today" || lbl === "new today" || lbl === "new this month") {
    return { ...stat, value: liveStats.today };
  }
  // Revenue today
  if ((lbl.includes("revenue") || lbl.includes("amount")) && lbl.includes("today")) {
    if (liveStats.today_amount != null) return { ...stat, value: _fmtAmount(liveStats.today_amount) };
  }
  // Total revenue / total amount
  if ((lbl === "revenue" || lbl === "total revenue" || lbl === "total balance" || lbl === "total amount") && liveStats.total_amount != null) {
    return { ...stat, value: _fmtAmount(liveStats.total_amount) };
  }
  // Average price / avg value / avg balance / avg amount
  if ((lbl.includes("avg") || lbl.includes("average")) && (lbl.includes("price") || lbl.includes("fare") || lbl.includes("value") || lbl.includes("amount") || lbl.includes("balance")) && liveStats.avg_amount != null) {
    return { ...stat, value: _fmtAmount(liveStats.avg_amount) };
  }
  // Out of stock
  if (lbl.includes("out of stock") && liveStats.out_of_stock != null) {
    return { ...stat, value: liveStats.out_of_stock };
  }
  // In Stock = total - out_of_stock
  if (lbl === "in stock" && liveStats.out_of_stock != null) {
    return { ...stat, value: liveStats.total - liveStats.out_of_stock };
  }
  // Unread = total - bool_counts.is_read
  if (lbl === "unread" && liveStats.bool_counts.is_read !== undefined) {
    return { ...stat, value: liveStats.total - liveStats.bool_counts.is_read };
  }
  // Read
  if (lbl === "read" && liveStats.bool_counts.is_read !== undefined) {
    return { ...stat, value: liveStats.bool_counts.is_read };
  }
  // Count as synonym for Total
  if (lbl === "count" || lbl === "total count") {
    return { ...stat, value: liveStats.total };
  }
  // Status label match (e.g. "Pending", "Active", "Completed", "Approved")
  for (const [status, count] of Object.entries(liveStats.by_status)) {
    if (lbl === status || lbl === status.replace(/_/g, " ")) {
      return { ...stat, value: count };
    }
    if (lbl.includes(status.replace(/_/g, " ").toLowerCase())) {
      return { ...stat, value: count };
    }
  }
  // Boolean flag match (is_active → "active", is_online → "online now", is_approved → "approved")
  const boolMap: Record<string, string> = {
    is_active: "active", is_online: "online", is_approved: "approved",
    is_open: "open", is_verified: "verified", is_frozen: "frozen",
  };
  for (const [field, keyword] of Object.entries(boolMap)) {
    if (lbl.includes(keyword) && liveStats.bool_counts[field] !== undefined) {
      return { ...stat, value: liveStats.bool_counts[field] };
    }
  }
  return stat;
}

function csvEscape(value: unknown): string {
  if (value == null || value === "") return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Applies `AdvancedFilterDialog` state to a row when `config.advFilterFields` is set. */
function matchesAdvFilters<T extends Record<string, any>>(
  item: T,
  filters: Record<string, any>,
  fields: FilterField[] | undefined,
): boolean {
  if (!fields?.length) return true;
  for (const f of fields) {
    if (f.type === "number") {
      const minV = filters[`${f.key}_min`];
      const maxV = filters[`${f.key}_max`];
      if ((minV === "" || minV === undefined) && (maxV === "" || maxV === undefined)) continue;
      const raw = item[f.key];
      const num = typeof raw === "number" ? raw : parseFloat(String(raw));
      if (Number.isNaN(num)) return false;
      if (minV !== "" && minV !== undefined && num < Number(minV)) return false;
      if (maxV !== "" && maxV !== undefined && num > Number(maxV)) return false;
      continue;
    }
    if (f.type === "date_range") {
      const from = filters[`${f.key}_from`];
      const to = filters[`${f.key}_to`];
      if (!from && !to) continue;
      const val = String(item[f.key] ?? "").slice(0, 10);
      if ((from || to) && !val) return false;
      if (from && val < String(from)) return false;
      if (to && val > String(to)) return false;
      continue;
    }
    const v = filters[f.key];
    if (v === "" || v === undefined || v === null || v === false) continue;
    if (f.type === "boolean") {
      if (v === true && !item[f.key]) return false;
      continue;
    }
    if (f.type === "select") {
      if (String(item[f.key] ?? "") !== String(v)) return false;
      continue;
    }
    if (f.type === "text") {
      if (!String(item[f.key] ?? "").toLowerCase().includes(String(v).toLowerCase())) return false;
      continue;
    }
    if (f.type === "date") {
      const val = String(item[f.key] ?? "").slice(0, 10);
      if (val !== String(v)) return false;
      continue;
    }
  }
  return true;
}

function CrudPage<T extends Record<string, any>>({ config }: { config: CrudPageConfig<T> }) {
  const resource = config.resource || TITLE_TO_RESOURCE[config.title];
  const { data, isLoading, isError, error } = useAdminResource<T>(resource || "", resource ? { page_size: 200 } : undefined);
  const createMutation = useCreateResource(resource || "");
  const updateMutation = useUpdateResource(resource || "");
  const deleteMutation = useDeleteResource(resource || "");

  // Fetch live stats for this resource (30-second refresh)
  const { data: liveStats } = useQuery({
    queryKey: ["admin-stats", resource],
    queryFn: () => fetchAdminStats(resource!),
    enabled: !!resource,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const initialItems = useMemo(
    () => (resource ? (data?.results || []) : config.generateData()),
    [resource, data?.results]
  );
  const [items, setItems] = useState<T[]>(initialItems);
  useEffect(() => {
    if (resource) {
      setItems(initialItems);
    }
  }, [resource, initialItems]);
  const [selected, setSelected] = useState<T | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
  const [advFilterOpen, setAdvFilterOpen] = useState(false);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [tablePage, setTablePage] = useState(1);
  const tablePageSize = 25;

  const filtered = items.filter((item) => {
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!config.searchKeys.some((k) => String(item[k] || "").toLowerCase().includes(q))) return false;
    }
    if (activeStatus !== "all" && config.statusKey && item[config.statusKey] !== activeStatus) return false;
    if (!matchesAdvFilters(item, advFilters, config.advFilterFields)) return false;
    return true;
  });

  const totalTablePages = Math.max(1, Math.ceil(filtered.length / tablePageSize));
  const currentTablePage = Math.min(tablePage, totalTablePages);
  const paginatedRows = filtered.slice(
    (currentTablePage - 1) * tablePageSize,
    currentTablePage * tablePageSize,
  );

  useEffect(() => {
    setTablePage(1);
  }, [searchQ, activeStatus, resource, items.length]);

  useEffect(() => {
    if (tablePage > totalTablePages) setTablePage(totalTablePages);
  }, [tablePage, totalTablePages]);

  const handleExport = () => {
    const headers = config.columns.map((c) => c.label);
    const keys = config.columns.map((c) => String(c.key));
    const lines = [
      headers.map(csvEscape).join(","),
      ...filtered.map((row) => keys.map((k) => csvEscape(row[k])).join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.title.replace(/\s+/g, "-").toLowerCase()}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported CSV");
  };

  const handleCreate = () => {
    const empty: any = {};
    config.formFields.forEach(f => { empty[f.key] = f.type === "boolean" ? false : f.type === "number" ? 0 : ""; });
    setEditing(empty); setIsEditing(false); setFormOpen(true);
  };

  const handleSave = () => {
    const missing = config.formFields.filter(f => f.required && !editing[f.key]);
    if (missing.length) { toast.error(`${missing[0].label} is required`); return; }
    const payload: Record<string, any> = { ...editing };
    if (resource) {
      if (isEditing && editing[config.idKey]) {
        updateMutation.mutate({ id: editing[config.idKey], data: payload }, {
          onSuccess: () => { toast.success(`${config.title} updated`); setFormOpen(false); },
        });
      } else {
        createMutation.mutate(payload, {
          onSuccess: () => { toast.success(`${config.title} created`); setFormOpen(false); },
        });
      }
    } else {
      if (isEditing && editing[config.idKey]) {
        setItems(prev => prev.map(i => i[config.idKey] === editing[config.idKey] ? { ...i, ...editing } : i));
      } else {
        setItems(prev => [{ ...editing, [config.idKey]: `${config.idPrefix}-${String(items.length + 1).padStart(4, "0")}` }, ...prev]);
      }
      toast.success(isEditing ? `${config.title} updated` : `${config.title} created`);
      setFormOpen(false);
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      if (resource) {
        deleteMutation.mutate(deleteTarget[config.idKey], {
          onSuccess: () => {
            toast.success("Deleted"); setDeleteOpen(false); setDeleteTarget(null);
            if (selected?.[config.idKey] === deleteTarget[config.idKey]) { setDrawerOpen(false); setSelected(null); }
          },
        });
      } else {
        setItems(prev => prev.filter(i => i[config.idKey] !== deleteTarget[config.idKey]));
        toast.success("Deleted"); setDeleteOpen(false); setDeleteTarget(null);
        if (selected?.[config.idKey] === deleteTarget[config.idKey]) { setDrawerOpen(false); setSelected(null); }
      }
    }
  };

  const advFilterCount = Object.values(advFilters).filter(v => v !== "" && v !== undefined && v !== null && v !== false).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title={config.title}
          subtitle={config.subtitle}
          createLabel={config.createLabel || "Create New"}
          onCreate={handleCreate}
          onExport={handleExport}
        />
        <StatsBar
          stats={config.stats.map(s => _applyLiveStat(s, liveStats))}
          className="!grid-cols-2 sm:!grid-cols-3 lg:!grid-cols-6"
        />
        <FilterBar
          searchPlaceholder={`Search ${config.title.toLowerCase()}...`}
          statusFilters={config.statusFilters}
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
          onSearch={setSearchQ}
          onAdvancedFilter={() => setAdvFilterOpen(true)}
          advancedFilterCount={advFilterCount}
        />
        {isLoading && resource ? <div className="text-sm text-muted-foreground">Loading...</div> : null}
        {isError && resource ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load {config.title}: {error instanceof Error ? error.message : "Unknown error"}
          </div>
        ) : null}
        {!isLoading && !isError && resource && filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground">No records match the current filters.</div>
        ) : null}
        <DataTable columns={config.columns} data={paginatedRows} onRowClick={(r: T) => { setSelected(r); setDrawerOpen(true); }} />
        {filtered.length > tablePageSize ? (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              Page {currentTablePage} of {totalTablePages} · {filtered.length} rows (filters applied)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentTablePage <= 1}
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentTablePage >= totalTablePages}
                onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selected ? String(selected[config.idKey] || config.title) : ""} subtitle="">
        {selected && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditing({ ...selected }); setIsEditing(true); setFormOpen(true); setDrawerOpen(false); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selected); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {config.formFields.map(f => (
                <div key={f.key}><span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{f.label}</span><p className="text-sm font-medium">{f.type === "boolean" ? (selected[f.key] ? "Yes" : "No") : String(selected[f.key] || "—")}</p></div>
              ))}
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditing ? `Edit ${config.title}` : `Create ${config.title}`}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4 grid grid-cols-2 gap-4">
            {config.formFields.map(f => (
              <div key={f.key} className={`space-y-1.5 ${f.type === "textarea" ? "col-span-2" : ""}`}>
                <Label>{f.label}{f.required ? " *" : ""}</Label>
                {f.type === "select" ? (
                  <Select value={editing[f.key] || ""} onValueChange={v => setEditing((p: any) => ({ ...p, [f.key]: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{(f.options || []).map(o => <SelectItem key={o} value={o} className="capitalize">{o}</SelectItem>)}</SelectContent>
                  </Select>
                ) : f.type === "boolean" ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg border"><Switch checked={editing[f.key] || false} onCheckedChange={v => setEditing((p: any) => ({ ...p, [f.key]: v }))} /><span className="text-sm text-muted-foreground">{editing[f.key] ? "Yes" : "No"}</span></div>
                ) : f.type === "textarea" ? (
                  <Textarea value={editing[f.key] || ""} onChange={e => setEditing((p: any) => ({ ...p, [f.key]: e.target.value }))} />
                ) : (
                  <Input type={f.type || "text"} value={editing[f.key] || ""} onChange={e => setEditing((p: any) => ({ ...p, [f.key]: f.type === "number" ? (parseFloat(e.target.value) || 0) : e.target.value }))} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button><Button onClick={handleSave}>{isEditing ? "Save" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {config.advFilterFields && <AdvancedFilterDialog open={advFilterOpen} onOpenChange={setAdvFilterOpen} fields={config.advFilterFields} filters={advFilters} onApply={setAdvFilters} onClear={() => setAdvFilters({})} />}
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title={`Delete ${config.title}`} description="This action cannot be undone." onConfirm={handleDelete} destructive />
    </AdminLayout>
  );
}

// ══════════════════════════════════════════════
// ECOMMERCE
// ══════════════════════════════════════════════
export const Vendors = () => <CrudPage config={{
  title: "Vendors", subtitle: "Manage ecommerce vendors", createLabel: "Add Vendor", idKey: "id", idPrefix: "VND",
  stats: [{ label: "Total", value: 124 }, { label: "Approved", value: 108 }, { label: "Revenue", value: "Rs. 8.4L" }, { label: "Pending", value: 16 }, { label: "Products", value: 2847 }, { label: "Active", value: 96 }],
  searchKeys: ["id", "name", "owner"],
  statusFilters: [{ label: "All", value: "all" }, { label: "Approved", value: "approved" }, { label: "Pending", value: "pending" }],
  statusKey: "status",
  formFields: [
    { key: "name", label: "Shop Name", required: true }, { key: "owner", label: "Owner Name", required: true },
    { key: "phone", label: "Phone" }, { key: "email", label: "Email" },
    { key: "address", label: "Address" }, { key: "category", label: "Category", type: "select", options: ["Electronics", "Fashion", "Grocery", "Home"] },
    { key: "commission", label: "Commission %" }, { key: "status", label: "Status", type: "select", options: ["approved", "pending", "suspended"] },
    { key: "is_verified", label: "Verified", type: "boolean" },
  ],
  columns: [
    { key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "store_name", label: "Shop", render: (r: any) => <span className="font-medium">{r.store_name || r.name}</span> },
    { key: "user_full_name", label: "Owner", render: (r: any) => r.user_full_name || r.user || "—" },
    { key: "category", label: "Category" },
    { key: "commission", label: "Commission" },
    { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> },
    { key: "is_verified", label: "Verified", render: (r: any) => <StatusBadge status={r.is_verified ? "active" : "pending"} /> },
  ],
  generateData: () => Array.from({ length: 15 }, (_, i) => ({
    id: `VND-${String(i + 1).padStart(4, "0")}`, name: ["Tech Hub", "Fashion World", "Green Grocery", "Home Decor"][i % 4],
    owner: ["Ram S.", "Sita G.", "Hari P."][i % 3], phone: `+977 98${Math.floor(1e7 + Math.random() * 9e7)}`,
    email: `vendor${i}@email.com`, address: ["Thamel", "Patan", "Baneshwor"][i % 3],
    category: ["Electronics", "Fashion", "Grocery", "Home"][i % 4], commission: `${10 + i % 5}%`,
    status: ["approved", "pending", "approved"][i % 3], is_verified: i % 3 !== 2,
  })),
}} />;

export const Products = () => <CrudPage config={{
  title: "Products", subtitle: "Browse all products", createLabel: "Add Product", idKey: "id", idPrefix: "PRD",
  stats: [{ label: "Total", value: 2847 }, { label: "In Stock", value: 2341 }, { label: "Active", value: 2156 }, { label: "Out of Stock", value: 506 }, { label: "Categories", value: 48 }, { label: "Avg Price", value: "Rs. 1,240" }],
  searchKeys: ["id", "name", "vendor"],
  formFields: [
    { key: "name", label: "Product Name", required: true }, { key: "vendor", label: "Vendor", required: true },
    { key: "category", label: "Category" }, { key: "price", label: "Price" },
    { key: "stock", label: "Stock", type: "number" }, { key: "sku", label: "SKU" },
    { key: "is_active", label: "Active", type: "boolean" }, { key: "description", label: "Description", type: "textarea" },
  ],
  columns: [
    { key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> },
    { key: "name", label: "Product", render: (r: any) => <span className="font-medium">{r.name}</span> },
    { key: "vendor_store_name", label: "Vendor", render: (r: any) => r.vendor_store_name || r.vendor || "—" },
    { key: "category_name", label: "Category", render: (r: any) => r.category_name || r.category || "—" },
    { key: "price", label: "Price", render: (r: any) => <span className="font-mono">{r.price}</span> },
    { key: "stock", label: "Stock", render: (r: any) => <span className="font-mono">{r.stock}</span> },
    { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> },
  ],
  generateData: () => Array.from({ length: 20 }, (_, i) => ({
    id: `PRD-${String(i + 1).padStart(4, "0")}`, name: ["Wireless Earbuds", "Cotton T-Shirt", "Rice 5kg", "Table Lamp"][i % 4],
    vendor: ["Tech Hub", "Fashion World", "Green Grocery"][i % 3], category: ["Electronics", "Fashion", "Grocery"][i % 3],
    price: `Rs. ${Math.floor(200 + Math.random() * 3000)}`, stock: Math.floor(Math.random() * 200),
    sku: `SKU-${String(Math.random()).slice(2, 8)}`, is_active: i % 5 !== 4, description: "",
  })),
}} />;

export const ProductCategories = () => <CrudPage config={{
  title: "Product Categories", subtitle: "Manage category tree", createLabel: "Add Category", idKey: "id", idPrefix: "CAT",
  stats: [{ label: "Categories", value: 48 }, { label: "Top Level", value: 12 }, { label: "Sub", value: 36 }, { label: "Active", value: 42 }, { label: "Products", value: 2847 }, { label: "Empty", value: 3 }],
  searchKeys: ["id", "name"], formFields: [{ key: "name", label: "Name", required: true }, { key: "parent", label: "Parent Category" }, { key: "slug", label: "Slug" }, { key: "is_active", label: "Active", type: "boolean" }, { key: "sort_order", label: "Sort Order", type: "number" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Name", render: (r: any) => <span className="font-medium">{r.name}</span> }, { key: "parent", label: "Parent" }, { key: "sort_order", label: "Order" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => Array.from({ length: 12 }, (_, i) => ({ id: `CAT-${String(i + 1).padStart(4, "0")}`, name: ["Electronics", "Fashion", "Grocery", "Home", "Sports", "Beauty"][i % 6], parent: i > 5 ? ["Electronics", "Fashion", "Grocery"][i % 3] : "—", slug: ["electronics", "fashion", "grocery", "home", "sports", "beauty"][i % 6], is_active: i % 4 !== 3, sort_order: i + 1 })),
}} />;

export const EcomOrders = () => <CrudPage config={{
  title: "Ecommerce Orders", subtitle: "Monitor ecommerce orders", idKey: "id", idPrefix: "EO",
  stats: [{ label: "Total", value: 4821 }, { label: "Live", value: 8, pulse: true }, { label: "Revenue Today", value: "Rs. 12K" }, { label: "Pending", value: 14 }, { label: "Delivered", value: 4200 }, { label: "Cancelled", value: 87 }],
  searchKeys: ["id", "customer", "vendor"], statusFilters: [{ label: "All", value: "all" }, { label: "Pending", value: "pending" }, { label: "Processing", value: "processing" }, { label: "Delivered", value: "delivered" }], statusKey: "status",
  formFields: [{ key: "customer", label: "Customer", required: true }, { key: "vendor", label: "Vendor", required: true }, { key: "items", label: "Items", type: "number" }, { key: "total", label: "Total" }, { key: "status", label: "Status", type: "select", options: ["pending", "processing", "shipped", "delivered", "cancelled"] }, { key: "payment", label: "Payment", type: "select", options: ["Cash", "Wallet", "eSewa"] }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "customer_full_name", label: "Customer", render: (r: any) => r.customer_full_name || r.customer || "—" }, { key: "vendor_store_name", label: "Vendor", render: (r: any) => r.vendor_store_name || r.vendor || "—" }, { key: "items_count", label: "Items", render: (r: any) => r.items_count || r.items }, { key: "total_amount", label: "Total", render: (r: any) => <span className="font-mono">Rs. {r.total_amount || r.total}</span> }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> }, { key: "payment_method", label: "Payment", render: (r: any) => r.payment_method || r.payment }],
  generateData: () => Array.from({ length: 20 }, (_, i) => ({ id: `EO-${String(i + 1).padStart(4, "0")}`, customer: ["Aarav S.", "Priya T.", "Bikash R."][i % 3], vendor: ["Tech Hub", "Fashion World"][i % 2], items: Math.floor(1 + Math.random() * 5), total: `Rs. ${Math.floor(500 + Math.random() * 5000)}`, status: ["pending", "processing", "shipped", "delivered", "cancelled"][i % 5], payment: ["Cash", "Wallet", "eSewa"][i % 3] })),
}} />;

// ══════════════════════════════════════════════
// ROOM RENT
// ══════════════════════════════════════════════
export const RoomListings = () => <CrudPage config={{
  title: "Room Listings", subtitle: "Manage room listings", createLabel: "Add Listing", idKey: "id", idPrefix: "RM",
  stats: [{ label: "Total", value: 847 }, { label: "Available", value: 542 }, { label: "Pending", value: 18 }, { label: "Rented", value: 287 }, { label: "Avg Price", value: "Rs. 12K" }, { label: "New Today", value: 4 }],
  searchKeys: ["id", "title", "location"], statusFilters: [{ label: "All", value: "all" }, { label: "Available", value: "available" }, { label: "Rented", value: "rented" }, { label: "Pending", value: "pending" }], statusKey: "status",
  formFields: [{ key: "title", label: "Title", required: true }, { key: "owner", label: "Owner", required: true }, { key: "location", label: "Location" }, { key: "price", label: "Monthly Price" }, { key: "rooms", label: "Rooms", type: "number" }, { key: "type", label: "Type", type: "select", options: ["Single", "Double", "Flat", "Apartment"] }, { key: "status", label: "Status", type: "select", options: ["available", "rented", "pending", "maintenance"] }, { key: "amenities", label: "Amenities" }, { key: "description", label: "Description", type: "textarea" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "title", label: "Title", render: (r: any) => <span className="font-medium">{r.title}</span> }, { key: "owner_display_name", label: "Owner", render: (r: any) => r.owner_display_name || r.owner || "—" }, { key: "full_address", label: "Address", render: (r: any) => r.full_address || r.city || "—" }, { key: "room_type", label: "Type", render: (r: any) => r.room_type || "—" }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> }],
  generateData: () => Array.from({ length: 15 }, (_, i) => ({ id: `RM-${String(i + 1).padStart(4, "0")}`, title: ["2BHK Flat Patan", "Single Room Thamel", "Studio Apartment"][i % 3], owner: ["Ram S.", "Sita G.", "Hari P."][i % 3], location: ["Patan", "Thamel", "Baneshwor"][i % 3], price: `Rs. ${Math.floor(5000 + Math.random() * 20000)}`, rooms: Math.floor(1 + Math.random() * 4), type: ["Single", "Double", "Flat"][i % 3], status: ["available", "rented", "pending"][i % 3], amenities: "WiFi, Parking", description: "" })),
}} />;

export const RoomOwners = () => <CrudPage config={{
  title: "Room Owners", subtitle: "Manage room owner profiles", createLabel: "Add Owner", idKey: "id", idPrefix: "RO",
  stats: [{ label: "Total", value: 284 }, { label: "Verified", value: 241 }, { label: "Listings", value: 847 }, { label: "Pending", value: 43 }, { label: "Active", value: 220 }, { label: "Revenue", value: "Rs. 2.4L" }],
  searchKeys: ["id", "name", "phone"],
  formFields: [{ key: "name", label: "Owner Name", required: true }, { key: "phone", label: "Phone", required: true }, { key: "email", label: "Email" }, { key: "address", label: "Address" }, { key: "listings", label: "Listings", type: "number" }, { key: "is_verified", label: "Verified", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Name", render: (r: any) => <span className="font-medium">{r.name}</span> }, { key: "phone", label: "Phone" }, { key: "listings", label: "Listings" }, { key: "is_verified", label: "Verified", render: (r: any) => <StatusBadge status={r.is_verified ? "active" : "pending"} /> }],
  generateData: () => Array.from({ length: 12 }, (_, i) => ({ id: `RO-${String(i + 1).padStart(4, "0")}`, name: ["Ram Shrestha", "Sita Gurung", "Hari Poudel"][i % 3], phone: `+977 98${Math.floor(1e7 + Math.random() * 9e7)}`, email: `owner${i}@email.com`, address: ["Patan", "Thamel"][i % 2], listings: Math.floor(1 + Math.random() * 5), is_verified: i % 3 !== 2 })),
}} />;

export const RoomInquiries = () => <CrudPage config={{
  title: "Room Inquiries", subtitle: "Customer inquiries", idKey: "id", idPrefix: "RI",
  stats: [{ label: "Total", value: 1247 }, { label: "Pending", value: 42 }, { label: "Replied", value: 1184 }, { label: "Today", value: 8 }, { label: "Avg Response", value: "2.4h" }, { label: "Conversion", value: "18%" }],
  searchKeys: ["id", "customer", "listing"], statusFilters: [{ label: "All", value: "all" }, { label: "Pending", value: "pending" }, { label: "Replied", value: "replied" }], statusKey: "status",
  formFields: [{ key: "customer", label: "Customer", required: true }, { key: "listing", label: "Listing", required: true }, { key: "message", label: "Message", type: "textarea" }, { key: "status", label: "Status", type: "select", options: ["pending", "replied", "closed"] }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "customer", label: "Customer" }, { key: "listing", label: "Listing" }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> }, { key: "created", label: "Created" }],
  generateData: () => Array.from({ length: 12 }, (_, i) => ({ id: `RI-${String(i + 1).padStart(4, "0")}`, customer: ["Aarav S.", "Priya T."][i % 2], listing: `RM-${String(i + 1).padStart(4, "0")}`, message: "Interested in this listing", status: ["pending", "replied", "closed"][i % 3], created: `${i + 1}h ago` })),
}} />;

export const RoomRequests = () => <CrudPage config={{
  title: "Booking Requests", subtitle: "Room booking requests", idKey: "id", idPrefix: "BR",
  stats: [{ label: "Total", value: 487 }, { label: "Pending", value: 15 }, { label: "Accepted", value: 384 }, { label: "Rejected", value: 88 }, { label: "Today", value: 5 }, { label: "Revenue", value: "Rs. 1.2L" }],
  searchKeys: ["id", "customer", "listing"], statusFilters: [{ label: "All", value: "all" }, { label: "Pending", value: "pending" }, { label: "Accepted", value: "accepted" }, { label: "Rejected", value: "rejected" }], statusKey: "status",
  formFields: [{ key: "customer", label: "Customer", required: true }, { key: "listing", label: "Listing", required: true }, { key: "move_in", label: "Move-in Date", type: "date" }, { key: "duration", label: "Duration (months)", type: "number" }, { key: "status", label: "Status", type: "select", options: ["pending", "accepted", "rejected"] }, { key: "notes", label: "Notes", type: "textarea" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "customer", label: "Customer" }, { key: "listing", label: "Listing" }, { key: "move_in", label: "Move-in" }, { key: "duration", label: "Duration" }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> }],
  generateData: () => Array.from({ length: 12 }, (_, i) => ({ id: `BR-${String(i + 1).padStart(4, "0")}`, customer: ["Aarav S.", "Priya T.", "Bikash R."][i % 3], listing: `RM-${String(i + 1).padStart(4, "0")}`, move_in: `2026-04-${String(1 + i).padStart(2, "0")}`, duration: `${Math.floor(3 + Math.random() * 9)} months`, status: ["pending", "accepted", "rejected"][i % 3], notes: "" })),
}} />;

// ══════════════════════════════════════════════
// FINANCE
// ══════════════════════════════════════════════
const financeGen = (prefix: string, n: number, extra: (i: number) => any) => () => Array.from({ length: n }, (_, i) => ({ id: `${prefix}-${String(i + 1).padStart(4, "0")}`, ...extra(i) }));

export const Wallets = () => <CrudPage config={{
  title: "Wallets", subtitle: "Overview of all wallets", idKey: "id", idPrefix: "WLT",
  stats: [{ label: "Total Balance", value: "Rs. 24.8L" }, { label: "Active", value: 8421 }, { label: "Topped Up Today", value: 42 }, { label: "Zero Balance", value: 124 }, { label: "Avg Balance", value: "Rs. 294" }, { label: "Frozen", value: 3 }],
  searchKeys: ["id", "user", "phone"],
  formFields: [{ key: "user", label: "User", required: true }, { key: "phone", label: "Phone" }, { key: "balance", label: "Balance" }, { key: "is_frozen", label: "Frozen", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "phone", label: "Phone" }, { key: "balance", label: "Balance", render: (r: any) => <span className="font-mono font-semibold">{r.balance}</span> }, { key: "is_frozen", label: "Status", render: (r: any) => <StatusBadge status={r.is_frozen ? "cancelled" : "active"} /> }],
  generateData: financeGen("WLT", 15, i => ({ user: ["Aarav S.", "Priya T.", "Bikash R."][i % 3], phone: `+977 98${Math.floor(1e7 + Math.random() * 9e7)}`, balance: `Rs. ${Math.floor(Math.random() * 5000)}`, is_frozen: i % 10 === 0 })),
}} />;

export const WalletTransactions = () => <CrudPage config={{
  title: "Wallet Transactions", subtitle: "All wallet transactions", idKey: "id", idPrefix: "WT",
  stats: [{ label: "Credited Today", value: "Rs. 1.2L" }, { label: "Debited", value: "Rs. 89K" }, { label: "Net Flow", value: "Rs. 31K" }, { label: "Count", value: 847 }, { label: "Avg Amount", value: "Rs. 142" }, { label: "Failed", value: 3 }],
  searchKeys: ["id", "user", "type"],
  formFields: [{ key: "user", label: "User", required: true }, { key: "type", label: "Type", type: "select", options: ["credit", "debit"] }, { key: "amount", label: "Amount" }, { key: "source", label: "Source" }, { key: "reference", label: "Reference ID" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "type", label: "Type", render: (r: any) => <StatusBadge status={r.type === "credit" ? "success" : "cancelled"} /> }, { key: "amount", label: "Amount", render: (r: any) => <span className="font-mono">{r.amount}</span> }, { key: "source", label: "Source" }, { key: "created", label: "Date" }],
  generateData: financeGen("WT", 20, i => ({ user: ["Aarav S.", "Priya T."][i % 2], type: ["credit", "debit"][i % 2], amount: `Rs. ${Math.floor(50 + Math.random() * 500)}`, source: ["Ride", "Topup", "Food", "Refund"][i % 4], reference: `REF-${Math.floor(1e6 + Math.random() * 9e6)}`, created: `${i + 1}h ago` })),
}} />;

export const Payments = () => <CrudPage config={{
  title: "Payments", subtitle: "Payment gateway transactions", idKey: "id", idPrefix: "PAY",
  stats: [{ label: "Total", value: "Rs. 4.8L" }, { label: "Success Rate", value: "96.2%" }, { label: "Failed", value: 18 }, { label: "Today", value: 142 }, { label: "eSewa", value: "48%" }, { label: "Khalti", value: "32%" }],
  searchKeys: ["id", "user", "gateway"],
  formFields: [{ key: "user", label: "User", required: true }, { key: "amount", label: "Amount" }, { key: "gateway", label: "Gateway", type: "select", options: ["eSewa", "Khalti", "IME Pay", "ConnectIPS"] }, { key: "status", label: "Status", type: "select", options: ["success", "failed", "pending", "refunded"] }, { key: "reference", label: "Reference" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "amount", label: "Amount", render: (r: any) => <span className="font-mono">{r.amount}</span> }, { key: "gateway", label: "Gateway" }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> }, { key: "created", label: "Date" }],
  generateData: financeGen("PAY", 20, i => ({ user: ["Aarav S.", "Priya T."][i % 2], amount: `Rs. ${Math.floor(100 + Math.random() * 2000)}`, gateway: ["eSewa", "Khalti", "IME Pay"][i % 3], status: ["success", "failed", "pending"][i % 3], reference: `GW-${Math.floor(1e6 + Math.random() * 9e6)}`, created: `${i + 1}h ago` })),
}} />;

export const PaymentIntents = () => <CrudPage config={{
  title: "Payment Intents", subtitle: "Track payment intents", idKey: "id", idPrefix: "PI",
  stats: [{ label: "Pending", value: 12 }, { label: "Success", value: 4821 }, { label: "Failed", value: 84 }, { label: "Today", value: 67 }, { label: "Avg Time", value: "12s" }, { label: "Timeout", value: 8 }],
  searchKeys: ["id", "user"],
  formFields: [{ key: "user", label: "User", required: true }, { key: "amount", label: "Amount" }, { key: "purpose", label: "Purpose", type: "select", options: ["ride", "food", "topup", "ecommerce", "room"] }, { key: "status", label: "Status", type: "select", options: ["pending", "success", "failed", "expired"] }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "amount", label: "Amount", render: (r: any) => <span className="font-mono">{r.amount}</span> }, { key: "purpose", label: "Purpose" }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> }],
  generateData: financeGen("PI", 15, i => ({ user: ["Aarav S.", "Priya T."][i % 2], amount: `Rs. ${Math.floor(50 + Math.random() * 1000)}`, purpose: ["ride", "food", "topup"][i % 3], status: ["pending", "success", "failed", "expired"][i % 4] })),
}} />;

export const QRSessions = () => <CrudPage config={{
  title: "QR Payment Sessions", subtitle: "QR code payment sessions", idKey: "id", idPrefix: "QR",
  stats: [{ label: "Scanned Today", value: 87 }, { label: "Expired", value: 12 }, { label: "Completion", value: "87.4%" }, { label: "Active", value: 4, pulse: true }, { label: "Avg Time", value: "45s" }, { label: "Total", value: 4821 }],
  searchKeys: ["id", "user"],
  formFields: [{ key: "user", label: "User", required: true }, { key: "amount", label: "Amount" }, { key: "provider", label: "Provider", type: "select", options: ["eSewa", "Khalti", "IME"] }, { key: "status", label: "Status", type: "select", options: ["active", "completed", "expired"] }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "amount", label: "Amount", render: (r: any) => <span className="font-mono">{r.amount}</span> }, { key: "provider", label: "Provider" }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> }],
  generateData: financeGen("QR", 12, i => ({ user: ["Aarav S.", "Priya T."][i % 2], amount: `Rs. ${Math.floor(50 + Math.random() * 500)}`, provider: ["eSewa", "Khalti", "IME"][i % 3], status: ["active", "completed", "expired"][i % 3] })),
}} />;

export const Topups = () => <CrudPage config={{
  title: "Topup Requests", subtitle: "Manage topup requests", idKey: "id", idPrefix: "TU",
  stats: [{ label: "Today", value: 42 }, { label: "Total Amount", value: "Rs. 48K" }, { label: "By eSewa", value: 28 }, { label: "Pending", value: 5 }, { label: "Approved", value: 37 }, { label: "Rejected", value: 0 }],
  searchKeys: ["id", "user"],
  formFields: [{ key: "user", label: "User", required: true }, { key: "amount", label: "Amount" }, { key: "method", label: "Method", type: "select", options: ["eSewa", "Khalti", "Bank Transfer", "Cash"] }, { key: "status", label: "Status", type: "select", options: ["pending", "approved", "rejected"] }, { key: "reference", label: "Reference" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "amount", label: "Amount", render: (r: any) => <span className="font-mono">{r.amount}</span> }, { key: "method", label: "Method" }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> }],
  generateData: financeGen("TU", 12, i => ({ user: ["Aarav S.", "Priya T."][i % 2], amount: `Rs. ${Math.floor(100 + Math.random() * 2000)}`, method: ["eSewa", "Khalti", "Bank Transfer"][i % 3], status: ["pending", "approved", "rejected"][i % 3], reference: `TXN-${Math.floor(1e6 + Math.random() * 9e6)}` })),
}} />;

export const Payouts = () => <CrudPage config={{
  title: "Rider Payouts", subtitle: "Manage rider payout requests", idKey: "id", idPrefix: "PO",
  stats: [{ label: "Pending", value: 12 }, { label: "Amount Pending", value: "Rs. 84K" }, { label: "Paid This Month", value: "Rs. 4.2L" }, { label: "Riders", value: 87 }, { label: "Avg Payout", value: "Rs. 4,827" }, { label: "Failed", value: 2 }],
  searchKeys: ["id", "rider"],
  formFields: [{ key: "rider", label: "Rider", required: true }, { key: "amount", label: "Amount" }, { key: "bank", label: "Bank Account" }, { key: "status", label: "Status", type: "select", options: ["pending", "processing", "completed", "failed"] }, { key: "notes", label: "Notes" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "rider", label: "Rider" }, { key: "amount", label: "Amount", render: (r: any) => <span className="font-mono font-semibold">{r.amount}</span> }, { key: "bank", label: "Bank" }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> }],
  generateData: financeGen("PO", 12, i => ({ rider: ["Ramesh K.", "Sunil T.", "Deepak G."][i % 3], amount: `Rs. ${Math.floor(1000 + Math.random() * 10000)}`, bank: ["NIC Asia", "Global IME", "Nabil"][i % 3], status: ["pending", "processing", "completed", "failed"][i % 4], notes: "" })),
}} />;

// ══════════════════════════════════════════════
// PRICING
// ══════════════════════════════════════════════
export const VehicleTypes = () => <CrudPage config={{
  title: "Vehicle Types", subtitle: "Configure vehicle types and fares", createLabel: "Add Vehicle Type", idKey: "id", idPrefix: "VT",
  stats: [{ label: "Types", value: 5 }, { label: "Active", value: 4 }, { label: "Female Driver", value: 2 }, { label: "Avg Base Fare", value: "Rs. 50" }, { label: "Per KM", value: "Rs. 18" }, { label: "Min Fare", value: "Rs. 80" }],
  searchKeys: ["id", "name"],
  formFields: [{ key: "name", label: "Name", required: true }, { key: "base_fare", label: "Base Fare" }, { key: "per_km", label: "Per KM" }, { key: "per_min", label: "Per Minute" }, { key: "min_fare", label: "Min Fare" }, { key: "capacity", label: "Capacity", type: "number" }, { key: "is_active", label: "Active", type: "boolean" }, { key: "has_female_option", label: "Female Driver Option", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Name", render: (r: any) => <span className="font-medium">{r.name}</span> }, { key: "base_fare", label: "Base" }, { key: "per_km", label: "/KM" }, { key: "min_fare", label: "Min" }, { key: "capacity", label: "Capacity" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => [{ id: "VT-0001", name: "Bike", base_fare: "Rs. 30", per_km: "Rs. 15", per_min: "Rs. 2", min_fare: "Rs. 50", capacity: 1, is_active: true, has_female_option: true }, { id: "VT-0002", name: "Car", base_fare: "Rs. 80", per_km: "Rs. 25", per_min: "Rs. 3", min_fare: "Rs. 150", capacity: 4, is_active: true, has_female_option: true }, { id: "VT-0003", name: "Auto", base_fare: "Rs. 40", per_km: "Rs. 18", per_min: "Rs. 2", min_fare: "Rs. 70", capacity: 3, is_active: true, has_female_option: false }, { id: "VT-0004", name: "Electric", base_fare: "Rs. 50", per_km: "Rs. 20", per_min: "Rs. 2", min_fare: "Rs. 80", capacity: 4, is_active: true, has_female_option: false }, { id: "VT-0005", name: "Premium", base_fare: "Rs. 150", per_km: "Rs. 35", per_min: "Rs. 5", min_fare: "Rs. 250", capacity: 4, is_active: false, has_female_option: false }],
}} />;

export const SurgeRules = () => <CrudPage config={{
  title: "Surge Rules", subtitle: "Dynamic pricing rules", createLabel: "Add Rule", idKey: "id", idPrefix: "SR",
  stats: [{ label: "Active", value: 8 }, { label: "Firing Now", value: 3, pulse: true }, { label: "Highest", value: "1.8×" }, { label: "Zones", value: 5 }, { label: "Time-based", value: 3 }, { label: "Demand-based", value: 5 }],
  searchKeys: ["id", "name"],
  formFields: [{ key: "name", label: "Rule Name", required: true }, { key: "multiplier", label: "Multiplier" }, { key: "trigger", label: "Trigger", type: "select", options: ["demand", "time", "weather", "event"] }, { key: "zone", label: "Zone" }, { key: "start_time", label: "Start Time" }, { key: "end_time", label: "End Time" }, { key: "is_active", label: "Active", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Rule" }, { key: "multiplier", label: "Multiplier", render: (r: any) => <span className="font-mono font-bold">{r.multiplier}</span> }, { key: "trigger", label: "Trigger" }, { key: "zone", label: "Zone" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} pulse={r.is_active} /> }],
  generateData: () => Array.from({ length: 8 }, (_, i) => ({ id: `SR-${String(i + 1).padStart(4, "0")}`, name: ["Peak Morning", "Peak Evening", "Rain Surge", "Festival", "Airport Zone", "High Demand"][i % 6], multiplier: `${(1.2 + Math.random() * 0.8).toFixed(1)}×`, trigger: ["demand", "time", "weather", "event"][i % 4], zone: ["Thamel", "All", "Airport", "Patan"][i % 4], start_time: "07:00", end_time: "09:00", is_active: i < 5 })),
}} />;

export const FareOverrides = () => <CrudPage config={{
  title: "Fare Overrides", subtitle: "Manual fare overrides", createLabel: "Add Override", idKey: "id", idPrefix: "FO",
  stats: [{ label: "Active", value: 3 }, { label: "Expiring Today", value: 1 }, { label: "Rides Affected", value: 42 }, { label: "Total", value: 8 }, { label: "By Admin", value: 6 }, { label: "Auto", value: 2 }],
  searchKeys: ["id", "route"], formFields: [{ key: "route", label: "Route", required: true }, { key: "override_fare", label: "Override Fare" }, { key: "reason", label: "Reason" }, { key: "expires_at", label: "Expires At", type: "date" }, { key: "is_active", label: "Active", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "route", label: "Route" }, { key: "override_fare", label: "Fare", render: (r: any) => <span className="font-mono">{r.override_fare}</span> }, { key: "reason", label: "Reason" }, { key: "expires_at", label: "Expires" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => Array.from({ length: 5 }, (_, i) => ({ id: `FO-${String(i + 1).padStart(4, "0")}`, route: ["Thamel→Airport", "Patan→Kirtipur"][i % 2], override_fare: `Rs. ${Math.floor(200 + Math.random() * 300)}`, reason: ["Construction", "Festival", "Flood"][i % 3], expires_at: "2026-03-25", is_active: i < 3 })),
}} />;

export const FareEstimates = () => <CrudPage config={{
  title: "Fare Estimates", subtitle: "Audit trail of fare calculations", idKey: "id", idPrefix: "FE",
  stats: [{ label: "Today", value: 847 }, { label: "With Surge", value: 124 }, { label: "With Override", value: 18 }, { label: "Avg Estimate", value: "Rs. 185" }, { label: "Accuracy", value: "94%" }, { label: "Disputes", value: 3 }],
  searchKeys: ["id", "user"], formFields: [{ key: "user", label: "User" }, { key: "pickup", label: "Pickup" }, { key: "drop", label: "Drop" }, { key: "vehicle", label: "Vehicle" }, { key: "estimate", label: "Estimate" }, { key: "surge", label: "Surge" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "pickup", label: "Pickup" }, { key: "drop", label: "Drop" }, { key: "estimate", label: "Estimate", render: (r: any) => <span className="font-mono">{r.estimate}</span> }, { key: "surge", label: "Surge" }],
  generateData: financeGen("FE", 15, i => ({ user: ["Aarav S.", "Priya T."][i % 2], pickup: ["Baneshwor", "Thamel"][i % 2], drop: ["Airport", "Patan"][i % 2], vehicle: ["Bike", "Car"][i % 2], estimate: `Rs. ${Math.floor(80 + Math.random() * 400)}`, surge: i % 3 === 0 ? "1.5×" : "—" })),
}} />;

export const CoinRate = () => <CrudPage config={{
  title: "Coin Rate", subtitle: "Configure coin exchange rate", createLabel: "Add Rate", idKey: "id", idPrefix: "CR",
  stats: [{ label: "Current", value: "Rs. 10 = 1 Coin" }, { label: "Total Issued", value: "124K" }, { label: "Changes", value: 8 }, { label: "Last Updated", value: "2d ago" }, { label: "Redeemed", value: "48K" }, { label: "Active", value: "76K" }],
  searchKeys: ["id"], formFields: [{ key: "rate", label: "Rate (Rs per Coin)", required: true }, { key: "effective_from", label: "Effective From", type: "date" }, { key: "notes", label: "Notes" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "rate", label: "Rate", render: (r: any) => <span className="font-mono font-bold">{r.rate}</span> }, { key: "effective_from", label: "From" }, { key: "notes", label: "Notes" }],
  generateData: () => Array.from({ length: 5 }, (_, i) => ({ id: `CR-${String(i + 1).padStart(4, "0")}`, rate: `Rs. ${10 - i}`, effective_from: `2026-0${3 - i}-01`, notes: i === 0 ? "Current rate" : "" })),
}} />;

// ══════════════════════════════════════════════
// PROMOTIONS
// ══════════════════════════════════════════════
export const PromoCodes = () => <CrudPage config={{
  title: "Promo Codes", subtitle: "Manage promotional codes", createLabel: "Create Code", idKey: "id", idPrefix: "PC",
  stats: [{ label: "Active", value: 24 }, { label: "Expiring Soon", value: 3 }, { label: "Redemptions", value: 4821 }, { label: "Discount Given", value: "Rs. 84K" }, { label: "Avg Discount", value: "Rs. 17" }, { label: "New This Week", value: 4 }],
  searchKeys: ["id", "code"],
  formFields: [{ key: "code", label: "Code", required: true }, { key: "discount_type", label: "Discount Type", type: "select", options: ["percentage", "flat"] }, { key: "discount_value", label: "Value" }, { key: "max_uses", label: "Max Uses", type: "number" }, { key: "min_order", label: "Min Order" }, { key: "expires_at", label: "Expires At", type: "date" }, { key: "is_active", label: "Active", type: "boolean" }, { key: "description", label: "Description", type: "textarea" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "code", label: "Code", render: (r: any) => <span className="font-mono font-bold">{r.code}</span> }, { key: "discount_type", label: "Type" }, { key: "discount_value", label: "Value" }, { key: "max_uses", label: "Max Uses" }, { key: "expires_at", label: "Expires" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => Array.from({ length: 12 }, (_, i) => ({ id: `PC-${String(i + 1).padStart(4, "0")}`, code: ["RIDE20", "FOOD15", "NEWUSER", "DIWALI50", "FLAT100"][i % 5], discount_type: ["percentage", "flat"][i % 2], discount_value: i % 2 === 0 ? `${10 + i * 5}%` : `Rs. ${50 * (i + 1)}`, max_uses: Math.floor(100 + Math.random() * 500), min_order: `Rs. ${Math.floor(100 + Math.random() * 300)}`, expires_at: "2026-04-30", is_active: i < 8, description: "" })),
}} />;

export const PromoUsage = () => <CrudPage config={{
  title: "Promo Usage", subtitle: "Track promo code usage", idKey: "id", idPrefix: "PU",
  stats: [{ label: "Used Today", value: 42 }, { label: "Discount Given", value: "Rs. 12K" }, { label: "Users", value: 38 }, { label: "Most Used", value: "RIDE20" }, { label: "Avg Discount", value: "Rs. 45" }, { label: "Total", value: 4821 }],
  searchKeys: ["id", "user", "code"],
  formFields: [{ key: "user", label: "User" }, { key: "code", label: "Promo Code" }, { key: "discount", label: "Discount" }, { key: "order_id", label: "Order ID" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "code", label: "Code", render: (r: any) => <span className="font-mono">{r.code}</span> }, { key: "discount", label: "Discount", render: (r: any) => <span className="font-mono">{r.discount}</span> }, { key: "created", label: "Used At" }],
  generateData: financeGen("PU", 15, i => ({ user: ["Aarav S.", "Priya T."][i % 2], code: ["RIDE20", "FOOD15", "NEWUSER"][i % 3], discount: `Rs. ${Math.floor(20 + Math.random() * 100)}`, order_id: `RB-${2000 + i}`, created: `${i + 1}h ago` })),
}} />;

export const BirthdayPromos = () => <CrudPage config={{
  title: "Birthday Promos", subtitle: "Birthday promotional offers", createLabel: "Create Promo", idKey: "id", idPrefix: "BP",
  stats: [{ label: "Active", value: 3 }, { label: "Sent This Month", value: 87 }, { label: "Redemption", value: "42%" }, { label: "Budget", value: "Rs. 10K" }, { label: "Templates", value: 3 }, { label: "Upcoming", value: 14 }],
  searchKeys: ["id", "name"],
  formFields: [{ key: "name", label: "Promo Name", required: true }, { key: "discount", label: "Discount" }, { key: "valid_days", label: "Valid Days", type: "number" }, { key: "message", label: "Message", type: "textarea" }, { key: "is_active", label: "Active", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Name" }, { key: "discount", label: "Discount" }, { key: "valid_days", label: "Valid Days" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => [{ id: "BP-0001", name: "Birthday 20% Off", discount: "20%", valid_days: 7, message: "Happy Birthday! 🎂", is_active: true }, { id: "BP-0002", name: "Birthday Free Ride", discount: "Rs. 100", valid_days: 3, message: "Enjoy a free ride!", is_active: true }, { id: "BP-0003", name: "Birthday Coins", discount: "50 Coins", valid_days: 5, message: "Bonus coins!", is_active: false }],
}} />;

export const Referrals = () => <CrudPage config={{
  title: "Referral Rewards", subtitle: "Track referral program", idKey: "id", idPrefix: "RF",
  stats: [{ label: "Total", value: 2847 }, { label: "Paid", value: 2104 }, { label: "Coins Awarded", value: "48K" }, { label: "This Month", value: 124 }, { label: "Avg Reward", value: "Rs. 50" }, { label: "Pending", value: 87 }],
  searchKeys: ["id", "referrer", "referred"],
  formFields: [{ key: "referrer", label: "Referrer", required: true }, { key: "referred", label: "Referred User", required: true }, { key: "reward_type", label: "Reward Type", type: "select", options: ["coins", "cash", "discount"] }, { key: "reward_value", label: "Reward Value" }, { key: "status", label: "Status", type: "select", options: ["pending", "paid", "expired"] }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "referrer", label: "Referrer" }, { key: "referred", label: "Referred" }, { key: "reward_type", label: "Type" }, { key: "reward_value", label: "Value" }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> }],
  generateData: financeGen("RF", 12, i => ({ referrer: ["Aarav S.", "Priya T."][i % 2], referred: ["Bikash R.", "Sunita G."][i % 2], reward_type: ["coins", "cash"][i % 2], reward_value: i % 2 === 0 ? "50 Coins" : "Rs. 50", status: ["pending", "paid", "expired"][i % 3] })),
}} />;

export const PopupAds = () => <CrudPage config={{
  title: "Popup Ads", subtitle: "In-app popup ads", createLabel: "Create Ad", idKey: "id", idPrefix: "PA",
  stats: [{ label: "Active", value: 3 }, { label: "Views", value: 12847 }, { label: "Clicks", value: 847 }, { label: "CTR", value: "6.6%" }, { label: "Expiring", value: 1 }, { label: "Total", value: 8 }],
  searchKeys: ["id", "title"],
  formFields: [{ key: "title", label: "Title", required: true }, { key: "image_url", label: "Image URL" }, { key: "link", label: "Link URL" }, { key: "target", label: "Target", type: "select", options: ["all_users", "riders", "new_users", "premium"] }, { key: "starts_at", label: "Start Date", type: "date" }, { key: "ends_at", label: "End Date", type: "date" }, { key: "is_active", label: "Active", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "title", label: "Title" }, { key: "target", label: "Target" }, { key: "starts_at", label: "Start" }, { key: "ends_at", label: "End" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => Array.from({ length: 5 }, (_, i) => ({ id: `PA-${String(i + 1).padStart(4, "0")}`, title: ["Dashain Offer", "New Year Sale", "Referral Bonus", "Premium Launch"][i % 4], image_url: "", link: "https://example.com", target: ["all_users", "riders", "new_users"][i % 3], starts_at: "2026-03-01", ends_at: "2026-04-01", is_active: i < 3 })),
}} />;

// ══════════════════════════════════════════════
// LOYALTY (all modules)
// ══════════════════════════════════════════════
export const LoyaltyTiers = () => <CrudPage config={{
  title: "Loyalty Tiers", subtitle: "Configure loyalty tiers", createLabel: "Add Tier", idKey: "id", idPrefix: "LT",
  stats: [{ label: "Tiers", value: 5 }, { label: "Members", value: 8421 }, { label: "Upgrades", value: 124 }, { label: "Gold+", value: 847 }, { label: "Platinum", value: 124 }, { label: "Bronze", value: 4200 }],
  searchKeys: ["id", "name"],
  formFields: [{ key: "name", label: "Tier Name", required: true }, { key: "min_points", label: "Min Points", type: "number" }, { key: "multiplier", label: "Points Multiplier" }, { key: "benefits", label: "Benefits", type: "textarea" }, { key: "color", label: "Color" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Tier", render: (r: any) => <span className="font-medium">{r.name}</span> }, { key: "min_points", label: "Min Points" }, { key: "multiplier", label: "Multiplier" }, { key: "members", label: "Members" }],
  generateData: () => [{ id: "LT-0001", name: "Bronze", min_points: 0, multiplier: "1×", benefits: "Basic rewards", color: "#CD7F32", members: 4200 }, { id: "LT-0002", name: "Silver", min_points: 500, multiplier: "1.5×", benefits: "Priority support", color: "#C0C0C0", members: 2400 }, { id: "LT-0003", name: "Gold", min_points: 2000, multiplier: "2×", benefits: "Free upgrades", color: "#FFD700", members: 700 }, { id: "LT-0004", name: "Platinum", min_points: 5000, multiplier: "3×", benefits: "VIP access", color: "#E5E4E2", members: 124 }, { id: "LT-0005", name: "Diamond", min_points: 10000, multiplier: "5×", benefits: "All benefits", color: "#B9F2FF", members: 12 }],
}} />;

export const LoyaltyUsers = () => <CrudPage config={{
  title: "User Loyalty Profiles", subtitle: "Track user loyalty data", idKey: "id", idPrefix: "LU",
  stats: [{ label: "Gold+", value: 847 }, { label: "Avg Points", value: 284 }, { label: "Active Streaks", value: 1247 }, { label: "Total Users", value: 8421 }, { label: "Upgrades", value: 42 }, { label: "Downgrades", value: 8 }],
  searchKeys: ["id", "user"], formFields: [{ key: "user", label: "User" }, { key: "tier", label: "Tier" }, { key: "points", label: "Points", type: "number" }, { key: "streak", label: "Streak Days", type: "number" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "tier", label: "Tier", render: (r: any) => <Badge variant="secondary">{r.tier}</Badge> }, { key: "points", label: "Points", render: (r: any) => <span className="font-mono">{r.points}</span> }, { key: "streak", label: "Streak" }],
  generateData: financeGen("LU", 15, i => ({ user: ["Aarav S.", "Priya T.", "Bikash R."][i % 3], tier: ["Bronze", "Silver", "Gold", "Platinum"][i % 4], points: Math.floor(Math.random() * 5000), streak: Math.floor(Math.random() * 30) })),
}} />;

export const LoyaltyTransactions = () => <CrudPage config={{
  title: "Loyalty Transactions", subtitle: "Points earned and redeemed", idKey: "id", idPrefix: "LTX",
  stats: [{ label: "Issued Today", value: "4.2K" }, { label: "Redeemed", value: "1.8K" }, { label: "Net", value: "+2.4K" }, { label: "Users", value: 284 }, { label: "Avg Earn", value: 14 }, { label: "Avg Redeem", value: 42 }],
  searchKeys: ["id", "user"], formFields: [{ key: "user", label: "User" }, { key: "type", label: "Type", type: "select", options: ["earn", "redeem", "bonus", "expire"] }, { key: "points", label: "Points", type: "number" }, { key: "source", label: "Source" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "type", label: "Type", render: (r: any) => <StatusBadge status={r.type === "earn" ? "success" : r.type === "redeem" ? "cancelled" : "pending"} /> }, { key: "points", label: "Points", render: (r: any) => <span className="font-mono">{r.points}</span> }, { key: "source", label: "Source" }],
  generateData: financeGen("LTX", 15, i => ({ user: ["Aarav S.", "Priya T."][i % 2], type: ["earn", "redeem", "bonus"][i % 3], points: Math.floor(10 + Math.random() * 100), source: ["ride", "food", "referral"][i % 3] })),
}} />;

export const Streaks = () => <CrudPage config={{
  title: "User Streaks", subtitle: "Active user streaks", idKey: "id", idPrefix: "STR",
  stats: [{ label: "Active", value: 1247 }, { label: "At Reward", value: 84 }, { label: "Best", value: "47 days" }, { label: "Avg", value: "8 days" }, { label: "Broken Today", value: 12 }, { label: "New Today", value: 24 }],
  searchKeys: ["id", "user"], formFields: [{ key: "user", label: "User" }, { key: "current_streak", label: "Current Streak", type: "number" }, { key: "best_streak", label: "Best Streak", type: "number" }, { key: "reward_level", label: "Reward Level", type: "number" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "current_streak", label: "Current", render: (r: any) => <span className="font-mono font-bold">{r.current_streak} days</span> }, { key: "best_streak", label: "Best" }, { key: "reward_level", label: "Level" }],
  generateData: financeGen("STR", 12, i => ({ user: ["Aarav S.", "Priya T.", "Bikash R."][i % 3], current_streak: Math.floor(Math.random() * 30), best_streak: Math.floor(10 + Math.random() * 40), reward_level: Math.floor(1 + Math.random() * 5) })),
}} />;

export const LoyaltyAchievements = () => <CrudPage config={{
  title: "Achievements", subtitle: "Manage achievement badges", createLabel: "Create Badge", idKey: "id", idPrefix: "ACH",
  stats: [{ label: "Badges", value: 18 }, { label: "Awarded", value: 247 }, { label: "Most Earned", value: "Century Rider" }, { label: "Rarest", value: "Legend" }, { label: "This Month", value: 42 }, { label: "Active", value: 15 }],
  searchKeys: ["id", "name"], formFields: [{ key: "name", label: "Badge Name", required: true }, { key: "description", label: "Description", type: "textarea" }, { key: "criteria", label: "Criteria" }, { key: "points", label: "Points Reward", type: "number" }, { key: "icon", label: "Icon" }, { key: "is_active", label: "Active", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Badge", render: (r: any) => <span className="font-medium">{r.name}</span> }, { key: "criteria", label: "Criteria" }, { key: "points", label: "Points" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => Array.from({ length: 8 }, (_, i) => ({ id: `ACH-${String(i + 1).padStart(4, "0")}`, name: ["Century Rider", "First Ride", "Night Owl", "Streak Master", "5 Star", "Big Spender", "Explorer", "Legend"][i], description: "Achievement description", criteria: ["100 rides", "First ride", "10 night rides", "30 day streak"][i % 4], points: Math.floor(50 + Math.random() * 200), icon: "🏆", is_active: i < 6 })),
}} />;

export const TripTargets = () => <CrudPage config={{
  title: "Trip Targets", subtitle: "Rider trip target bonuses", createLabel: "Add Target", idKey: "id", idPrefix: "TT",
  stats: [{ label: "Active", value: 4 }, { label: "Qualifying", value: 87 }, { label: "Bonuses Pending", value: "Rs. 24K" }, { label: "Paid", value: "Rs. 84K" }, { label: "Riders", value: 124 }, { label: "Avg Bonus", value: "Rs. 680" }],
  searchKeys: ["id", "name"], formFields: [{ key: "name", label: "Target Name", required: true }, { key: "trips_required", label: "Trips Required", type: "number" }, { key: "bonus_amount", label: "Bonus Amount" }, { key: "period", label: "Period", type: "select", options: ["daily", "weekly", "monthly"] }, { key: "is_active", label: "Active", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Target" }, { key: "trips_required", label: "Trips" }, { key: "bonus_amount", label: "Bonus", render: (r: any) => <span className="font-mono">{r.bonus_amount}</span> }, { key: "period", label: "Period" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => [{ id: "TT-0001", name: "Daily 10", trips_required: 10, bonus_amount: "Rs. 200", period: "daily", is_active: true }, { id: "TT-0002", name: "Weekly 50", trips_required: 50, bonus_amount: "Rs. 1000", period: "weekly", is_active: true }, { id: "TT-0003", name: "Monthly 200", trips_required: 200, bonus_amount: "Rs. 5000", period: "monthly", is_active: true }, { id: "TT-0004", name: "Weekend Rush", trips_required: 20, bonus_amount: "Rs. 500", period: "weekly", is_active: false }],
}} />;

export const DemandForecast = () => <CrudPage config={{
  title: "Demand Forecasting", subtitle: "Predicted demand & rider nudges", idKey: "id", idPrefix: "DF",
  stats: [{ label: "Active Zones", value: 8 }, { label: "Nudges Sent", value: 42 }, { label: "Acted On", value: "68%" }, { label: "Accuracy", value: "87%" }, { label: "High Demand", value: 3, pulse: true }, { label: "Low Supply", value: 2 }],
  searchKeys: ["id", "zone"], formFields: [{ key: "zone", label: "Zone", required: true }, { key: "predicted_demand", label: "Predicted Demand", type: "number" }, { key: "current_supply", label: "Current Supply", type: "number" }, { key: "nudge_sent", label: "Nudge Sent", type: "boolean" }, { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "critical"] }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "zone", label: "Zone" }, { key: "predicted_demand", label: "Demand" }, { key: "current_supply", label: "Supply" }, { key: "priority", label: "Priority", render: (r: any) => <StatusBadge status={r.priority === "critical" ? "cancelled" : r.priority === "high" ? "pending" : "active"} /> }, { key: "nudge_sent", label: "Nudged", render: (r: any) => r.nudge_sent ? "✅" : "—" }],
  generateData: () => Array.from({ length: 8 }, (_, i) => ({ id: `DF-${String(i + 1).padStart(4, "0")}`, zone: ["Thamel", "Patan", "Baneshwor", "Kirtipur", "Lazimpat", "Airport", "Koteshwor", "Chabahil"][i], predicted_demand: Math.floor(20 + Math.random() * 50), current_supply: Math.floor(5 + Math.random() * 30), nudge_sent: i < 4, priority: ["low", "medium", "high", "critical"][i % 4] })),
}} />;

// ══════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════
export const SendPush = () => <CrudPage config={{
  title: "Send Push Notification", subtitle: "Compose and send notifications", createLabel: "Send New", idKey: "id", idPrefix: "PN",
  stats: [{ label: "Sent Today", value: 128 }, { label: "Success", value: "94.2%" }, { label: "Failed", value: 8 }, { label: "Scheduled", value: 3 }, { label: "Audience", value: "8.4K" }, { label: "Opened", value: "67%" }],
  searchKeys: ["id", "title"],
  formFields: [{ key: "title", label: "Title", required: true }, { key: "body", label: "Body", type: "textarea", required: true }, { key: "target", label: "Target", type: "select", options: ["all_users", "riders", "customers", "premium", "inactive"] }, { key: "schedule", label: "Schedule", type: "date" }, { key: "is_sent", label: "Send Immediately", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "title", label: "Title" }, { key: "target", label: "Target" }, { key: "sent_count", label: "Sent" }, { key: "is_sent", label: "Status", render: (r: any) => <StatusBadge status={r.is_sent ? "completed" : "pending"} /> }],
  generateData: financeGen("PN", 10, i => ({ title: ["New Year Offer!", "Complete your profile", "Rate your last ride", "Refer & Earn"][i % 4], body: "Notification body...", target: ["all_users", "riders", "customers"][i % 3], sent_count: Math.floor(1000 + Math.random() * 5000), is_sent: i < 7, schedule: "" })),
}} />;

export const NotifTemplates = () => <CrudPage config={{
  title: "Notification Templates", subtitle: "Manage templates", createLabel: "Create Template", idKey: "id", idPrefix: "NT",
  stats: [{ label: "Templates", value: 24 }, { label: "Active", value: 18 }, { label: "By Role", value: 6 }, { label: "Automated", value: 12 }, { label: "Manual", value: 12 }, { label: "Last Created", value: "2d ago" }],
  searchKeys: ["id", "name"],
  formFields: [{ key: "name", label: "Template Name", required: true }, { key: "title", label: "Notification Title", required: true }, { key: "body", label: "Body", type: "textarea" }, { key: "trigger", label: "Trigger", type: "select", options: ["manual", "ride_complete", "signup", "birthday", "inactivity"] }, { key: "is_active", label: "Active", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Name" }, { key: "trigger", label: "Trigger" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => Array.from({ length: 8 }, (_, i) => ({ id: `NT-${String(i + 1).padStart(4, "0")}`, name: ["Welcome", "Ride Complete", "Birthday", "Inactivity", "Payment", "Promo"][i % 6], title: "Notification Title", body: "Template body with {{variables}}", trigger: ["manual", "ride_complete", "signup", "birthday", "inactivity"][i % 5], is_active: i < 6 })),
}} />;

export const PushLogs = () => <CrudPage config={{
  title: "Push Logs", subtitle: "Track sent notifications", idKey: "id", idPrefix: "PL",
  stats: [{ label: "Sent Today", value: 128 }, { label: "Success", value: 121 }, { label: "Failed", value: 7 }, { label: "Opened", value: 84 }, { label: "Click Rate", value: "69%" }, { label: "Avg Time", value: "2.4s" }],
  searchKeys: ["id", "user", "title"],
  formFields: [{ key: "user", label: "User" }, { key: "title", label: "Title" }, { key: "status", label: "Status", type: "select", options: ["sent", "delivered", "opened", "failed"] }, { key: "sent_at", label: "Sent At" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "title", label: "Title" }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status === "opened" ? "success" : r.status === "failed" ? "cancelled" : "pending"} /> }, { key: "sent_at", label: "Sent At" }],
  generateData: financeGen("PL", 15, i => ({ user: ["Aarav S.", "Priya T."][i % 2], title: ["Welcome!", "Rate your ride", "New offer"][i % 3], status: ["sent", "delivered", "opened", "failed"][i % 4], sent_at: `${i + 1}h ago` })),
}} />;

export const NotifInbox = () => <CrudPage config={{
  title: "Inbox", subtitle: "All in-app notifications", idKey: "id", idPrefix: "NI",
  stats: [{ label: "Total", value: 48721 }, { label: "Unread", value: 2847 }, { label: "Read Rate", value: "94.2%" }, { label: "Today", value: 128 }, { label: "Actions", value: 842 }, { label: "Dismissed", value: 1247 }],
  searchKeys: ["id", "user", "title"],
  formFields: [{ key: "user", label: "User" }, { key: "title", label: "Title" }, { key: "message", label: "Message", type: "textarea" }, { key: "is_read", label: "Read", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "title", label: "Title" }, { key: "is_read", label: "Read", render: (r: any) => <StatusBadge status={r.is_read ? "completed" : "pending"} /> }, { key: "created", label: "Date" }],
  generateData: financeGen("NI", 15, i => ({ user: ["Aarav S.", "Priya T."][i % 2], title: ["Your ride is complete", "New offer available", "Payment received"][i % 3], message: "Notification message", is_read: i < 10, created: `${i + 1}h ago` })),
}} />;

// ══════════════════════════════════════════════
// SUPPORT, SETTINGS, ADMIN, ANALYTICS
// ══════════════════════════════════════════════
export const SupportTickets = () => <CrudPage config={{
  title: "Support Tickets", subtitle: "Manage customer support", createLabel: "Create Ticket", idKey: "id", idPrefix: "ST",
  stats: [{ label: "Open", value: 7 }, { label: "In Progress", value: 12 }, { label: "Resolved Today", value: 24 }, { label: "Avg Resolution", value: "4.2h" }, { label: "Satisfaction", value: "4.6/5" }, { label: "Total", value: 2847 }],
  searchKeys: ["id", "user", "subject"], statusFilters: [{ label: "All", value: "all" }, { label: "Open", value: "open" }, { label: "In Progress", value: "in_progress" }, { label: "Resolved", value: "resolved" }], statusKey: "status",
  formFields: [{ key: "user", label: "User", required: true }, { key: "subject", label: "Subject", required: true }, { key: "category", label: "Category", type: "select", options: ["ride", "payment", "food", "account", "other"] }, { key: "priority", label: "Priority", type: "select", options: ["low", "medium", "high", "urgent"] }, { key: "status", label: "Status", type: "select", options: ["open", "in_progress", "resolved", "closed"] }, { key: "description", label: "Description", type: "textarea" }, { key: "assigned_to", label: "Assigned To" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "user", label: "User" }, { key: "subject", label: "Subject" }, { key: "category", label: "Category" }, { key: "priority", label: "Priority", render: (r: any) => <StatusBadge status={r.priority === "urgent" ? "cancelled" : r.priority === "high" ? "pending" : "active"} /> }, { key: "status", label: "Status", render: (r: any) => <StatusBadge status={r.status} /> }],
  generateData: financeGen("ST", 15, i => ({ user: ["Aarav S.", "Priya T."][i % 2], subject: ["Payment issue", "Rider complaint", "App crash", "Refund request"][i % 4], category: ["ride", "payment", "food", "account"][i % 4], priority: ["low", "medium", "high", "urgent"][i % 4], status: ["open", "in_progress", "resolved", "closed"][i % 4], description: "", assigned_to: ["Admin 1", "Admin 2"][i % 2] })),
}} />;

export const AppSettings = () => <CrudPage config={{
  title: "App Settings", subtitle: "Configure app-wide settings", createLabel: "Add Setting", idKey: "id", idPrefix: "SET",
  stats: [{ label: "Settings", value: 18 }, { label: "Updated", value: "2h ago" }, { label: "By", value: "Super Admin" }, { label: "Categories", value: 5 }, { label: "Toggles", value: 8 }, { label: "Values", value: 10 }],
  searchKeys: ["id", "key"],
  formFields: [{ key: "key", label: "Setting Key", required: true }, { key: "value", label: "Value", required: true }, { key: "category", label: "Category", type: "select", options: ["general", "ride", "food", "payment", "notification"] }, { key: "description", label: "Description" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "key", label: "Key", render: (r: any) => <span className="font-mono">{r.key}</span> }, { key: "value", label: "Value", render: (r: any) => <span className="font-mono font-semibold">{r.value}</span> }, { key: "category", label: "Category" }],
  generateData: () => Array.from({ length: 10 }, (_, i) => ({ id: `SET-${String(i + 1).padStart(4, "0")}`, key: ["app_name", "default_currency", "max_ride_distance", "otp_expiry", "min_wallet_topup"][i % 5], value: ["Pugau", "NPR", "50km", "5min", "Rs. 100"][i % 5], category: ["general", "ride", "payment"][i % 3], description: "" })),
}} />;

export const ServiceCharges = () => <CrudPage config={{
  title: "Service Charges", subtitle: "Configure service charges", createLabel: "Add Charge", idKey: "id", idPrefix: "SC",
  stats: [{ label: "Room", value: "5%" }, { label: "Food", value: "3%" }, { label: "Ecommerce", value: "4%" }, { label: "Ride", value: "15%" }, { label: "Parcel", value: "10%" }, { label: "Last Updated", value: "1d ago" }],
  searchKeys: ["id", "service"],
  formFields: [{ key: "service", label: "Service", required: true, type: "select", options: ["ride", "food", "ecommerce", "room", "parcel"] }, { key: "charge_type", label: "Type", type: "select", options: ["percentage", "flat"] }, { key: "value", label: "Value" }, { key: "is_active", label: "Active", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "service", label: "Service" }, { key: "charge_type", label: "Type" }, { key: "value", label: "Value", render: (r: any) => <span className="font-mono font-bold">{r.value}</span> }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => [{ id: "SC-0001", service: "ride", charge_type: "percentage", value: "15%", is_active: true }, { id: "SC-0002", service: "food", charge_type: "percentage", value: "3%", is_active: true }, { id: "SC-0003", service: "ecommerce", charge_type: "percentage", value: "4%", is_active: true }, { id: "SC-0004", service: "room", charge_type: "percentage", value: "5%", is_active: true }, { id: "SC-0005", service: "parcel", charge_type: "percentage", value: "10%", is_active: true }],
}} />;

export const AppVersions = () => <CrudPage config={{
  title: "App Versions", subtitle: "Manage app version control", createLabel: "Add Version", idKey: "id", idPrefix: "AV",
  stats: [{ label: "Android", value: "2.4.1" }, { label: "iOS", value: "2.4.0" }, { label: "Force Update", value: "1 active" }, { label: "Versions", value: 12 }, { label: "Users on Latest", value: "78%" }, { label: "Outdated", value: "22%" }],
  searchKeys: ["id", "platform"],
  formFields: [{ key: "platform", label: "Platform", required: true, type: "select", options: ["android", "ios"] }, { key: "version", label: "Version", required: true }, { key: "build_number", label: "Build Number", type: "number" }, { key: "force_update", label: "Force Update", type: "boolean" }, { key: "release_notes", label: "Release Notes", type: "textarea" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "platform", label: "Platform" }, { key: "version", label: "Version", render: (r: any) => <span className="font-mono font-bold">{r.version}</span> }, { key: "build_number", label: "Build" }, { key: "force_update", label: "Force", render: (r: any) => r.force_update ? "⚠️ Yes" : "No" }],
  generateData: () => [{ id: "AV-0001", platform: "android", version: "2.4.1", build_number: 241, force_update: false, release_notes: "Bug fixes" }, { id: "AV-0002", platform: "ios", version: "2.4.0", build_number: 240, force_update: false, release_notes: "Performance improvements" }, { id: "AV-0003", platform: "android", version: "2.3.0", build_number: 230, force_update: true, release_notes: "Security update" }],
}} />;

export const QuickReplies = () => <CrudPage config={{
  title: "Quick Replies", subtitle: "Chat quick reply templates", createLabel: "Add Reply", idKey: "id", idPrefix: "QRP",
  stats: [{ label: "Templates", value: 12 }, { label: "Active", value: 10 }, { label: "For Riders", value: 8 }, { label: "For Support", value: 4 }, { label: "Most Used", value: "On my way" }, { label: "Uses Today", value: 42 }],
  searchKeys: ["id", "text"],
  formFields: [{ key: "text", label: "Reply Text", required: true }, { key: "category", label: "Category", type: "select", options: ["rider", "support", "customer"] }, { key: "sort_order", label: "Sort Order", type: "number" }, { key: "is_active", label: "Active", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "text", label: "Reply Text" }, { key: "category", label: "Category" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => Array.from({ length: 8 }, (_, i) => ({ id: `QRP-${String(i + 1).padStart(4, "0")}`, text: ["On my way", "Arrived at pickup", "Traffic delay", "Unable to find location", "Call customer", "Please wait"][i % 6], category: ["rider", "support", "customer"][i % 3], sort_order: i + 1, is_active: i < 6 })),
}} />;

export const CancellationPolicies = () => <CrudPage config={{
  title: "Cancellation Policies", subtitle: "Manage cancellation rules", createLabel: "Add Policy", idKey: "id", idPrefix: "CP",
  stats: [{ label: "Policies", value: 4 }, { label: "Active", value: 3 }, { label: "With Fee", value: 2 }, { label: "Free Window", value: "2 min" }, { label: "Avg Fee", value: "Rs. 25" }, { label: "Cancellations Today", value: 12 }],
  searchKeys: ["id", "name"],
  formFields: [{ key: "name", label: "Policy Name", required: true }, { key: "service", label: "Service", type: "select", options: ["ride", "food", "parcel"] }, { key: "free_window", label: "Free Window (min)", type: "number" }, { key: "fee", label: "Cancellation Fee" }, { key: "is_active", label: "Active", type: "boolean" }, { key: "description", label: "Description", type: "textarea" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Policy" }, { key: "service", label: "Service" }, { key: "free_window", label: "Free Window" }, { key: "fee", label: "Fee", render: (r: any) => <span className="font-mono">{r.fee}</span> }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => [{ id: "CP-0001", name: "Ride Cancel", service: "ride", free_window: "2 min", fee: "Rs. 25", is_active: true, description: "" }, { id: "CP-0002", name: "Food Cancel", service: "food", free_window: "1 min", fee: "Rs. 30", is_active: true, description: "" }, { id: "CP-0003", name: "Parcel Cancel", service: "parcel", free_window: "3 min", fee: "Rs. 20", is_active: true, description: "" }, { id: "CP-0004", name: "Old Policy", service: "ride", free_window: "5 min", fee: "Rs. 0", is_active: false, description: "" }],
}} />;

export const AdminList = () => <CrudPage config={{
  title: "Admin Users", subtitle: "Manage admin accounts", createLabel: "Add Admin", idKey: "id", idPrefix: "ADM",
  stats: [{ label: "Total", value: 8 }, { label: "Active", value: 7 }, { label: "Superadmins", value: 2 }, { label: "Last Login", value: "12m ago" }, { label: "Actions Today", value: 247 }, { label: "Locked", value: 1 }],
  searchKeys: ["id", "name", "email"],
  formFields: [{ key: "name", label: "Full Name", required: true }, { key: "email", label: "Email", required: true }, { key: "role", label: "Role", type: "select", options: ["super_admin", "admin", "moderator", "viewer"] }, { key: "is_active", label: "Active", type: "boolean" }, { key: "phone", label: "Phone" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Name", render: (r: any) => <span className="font-medium">{r.name}</span> }, { key: "email", label: "Email" }, { key: "role", label: "Role", render: (r: any) => <Badge variant="secondary" className="capitalize text-[10px]">{r.role?.replace("_", " ")}</Badge> }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => [{ id: "ADM-0001", name: "Super Admin", email: "super@pugau.com", role: "super_admin", is_active: true, phone: "+977 9841000000" }, { id: "ADM-0002", name: "Admin User", email: "admin@pugau.com", role: "admin", is_active: true, phone: "+977 9841000001" }, { id: "ADM-0003", name: "Moderator", email: "mod@pugau.com", role: "moderator", is_active: true, phone: "" }],
}} />;

export const ActivityLogs = () => <CrudPage config={{
  title: "Activity Logs", subtitle: "Track admin actions", idKey: "id", idPrefix: "AL",
  stats: [{ label: "Today", value: 247 }, { label: "Creates", value: 18 }, { label: "Updates", value: 184 }, { label: "Deletes", value: 12 }, { label: "Logins", value: 33 }, { label: "Admins Active", value: 5 }],
  searchKeys: ["id", "admin", "action"],
  formFields: [{ key: "admin", label: "Admin" }, { key: "action", label: "Action" }, { key: "module", label: "Module" }, { key: "details", label: "Details", type: "textarea" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "admin", label: "Admin" }, { key: "action", label: "Action", render: (r: any) => <StatusBadge status={r.action === "create" ? "success" : r.action === "delete" ? "cancelled" : "pending"} /> }, { key: "module", label: "Module" }, { key: "created", label: "Time" }],
  generateData: financeGen("AL", 20, i => ({ admin: ["Super Admin", "Admin User"][i % 2], action: ["create", "update", "delete", "login"][i % 4], module: ["users", "rides", "food", "settings"][i % 4], details: "", created: `${i + 1}m ago` })),
}} />;

export const Analytics = () => <CrudPage config={{
  title: "Analytics & Reports", subtitle: "Cross-module insights", idKey: "id", idPrefix: "RPT",
  stats: [{ label: "Revenue MTD", value: "Rs. 42L" }, { label: "Users Growth", value: "+12%" }, { label: "Bookings MTD", value: "18.4K" }, { label: "Avg Daily", value: "612" }, { label: "Top Module", value: "Rides" }, { label: "NPS", value: "72" }],
  searchKeys: ["id", "name"],
  formFields: [{ key: "name", label: "Report Name" }, { key: "module", label: "Module" }, { key: "period", label: "Period", type: "select", options: ["daily", "weekly", "monthly", "quarterly"] }, { key: "generated_at", label: "Generated At" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Report" }, { key: "module", label: "Module" }, { key: "period", label: "Period" }, { key: "generated_at", label: "Generated" }],
  generateData: () => Array.from({ length: 8 }, (_, i) => ({ id: `RPT-${String(i + 1).padStart(4, "0")}`, name: ["Revenue Report", "User Growth", "Ride Analytics", "Food Performance"][i % 4], module: ["all", "rides", "food", "ecommerce"][i % 4], period: ["daily", "weekly", "monthly"][i % 3], generated_at: `${i + 1}h ago` })),
}} />;

// Rider sub-pages
export const RiderLeaderboard = () => <CrudPage config={{
  title: "Rider Leaderboard", subtitle: "Top performing riders", idKey: "id", idPrefix: "RL",
  stats: [{ label: "#1", value: "Ramesh K." }, { label: "Prize Pool", value: "Rs. 25K" }, { label: "Participants", value: 284 }, { label: "Period", value: "March 2026" }, { label: "Min Rides", value: 50 }, { label: "Days Left", value: 10 }],
  searchKeys: ["id", "rider"],
  formFields: [{ key: "rider", label: "Rider" }, { key: "rides", label: "Rides", type: "number" }, { key: "rating", label: "Rating" }, { key: "earnings", label: "Earnings" }, { key: "rank", label: "Rank", type: "number" }],
  columns: [{ key: "rank", label: "#", render: (r: any) => <span className="font-mono font-bold">{r.rank}</span> }, { key: "rider", label: "Rider", render: (r: any) => <span className="font-medium">{r.rider}</span> }, { key: "rides", label: "Rides" }, { key: "rating", label: "Rating" }, { key: "earnings", label: "Earnings", render: (r: any) => <span className="font-mono">{r.earnings}</span> }],
  generateData: () => Array.from({ length: 10 }, (_, i) => ({ id: `RL-${String(i + 1).padStart(4, "0")}`, rank: i + 1, rider: ["Ramesh K.", "Sunil T.", "Deepak G.", "Prakash S.", "Hari B."][i % 5], rides: Math.floor(200 - i * 15), rating: (4.9 - i * 0.05).toFixed(2), earnings: `Rs. ${Math.floor(50000 - i * 4000)}` })),
}} />;

export const RiderAchievements = () => <CrudPage config={{
  title: "Rider Achievements", subtitle: "Achievement badge management", createLabel: "Create Badge", idKey: "id", idPrefix: "RA",
  stats: [{ label: "Badges", value: 18 }, { label: "Awarded", value: 247 }, { label: "Most Earned", value: "Century Rider" }, { label: "This Month", value: 42 }, { label: "Rarest", value: "Legend" }, { label: "Active", value: 15 }],
  searchKeys: ["id", "name"],
  formFields: [{ key: "name", label: "Badge Name", required: true }, { key: "description", label: "Description", type: "textarea" }, { key: "criteria", label: "Criteria" }, { key: "points", label: "Points", type: "number" }, { key: "is_active", label: "Active", type: "boolean" }],
  columns: [{ key: "id", label: "ID", render: (r: any) => <span className="font-mono text-xs">{r.id}</span> }, { key: "name", label: "Badge", render: (r: any) => <span className="font-medium">{r.name}</span> }, { key: "criteria", label: "Criteria" }, { key: "points", label: "Points" }, { key: "is_active", label: "Active", render: (r: any) => <StatusBadge status={r.is_active ? "online" : "offline"} /> }],
  generateData: () => Array.from({ length: 8 }, (_, i) => ({ id: `RA-${String(i + 1).padStart(4, "0")}`, name: ["Century Rider", "First Ride", "Night Owl", "Streak Master"][i % 4], description: "Badge description", criteria: ["100 rides", "First ride", "10 night rides", "30 day streak"][i % 4], points: Math.floor(50 + Math.random() * 200), is_active: i < 6 })),
}} />;
