import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Column } from "@/components/admin/DataTable";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ImagePickerField } from "@/components/admin/ImagePickerField";
import { MapPickerField } from "@/components/admin/MapPickerField";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Edit, Trash2, MapPin, Shield } from "lucide-react";
import { UserSearchField } from "@/components/admin/UserSearchField";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminResource, fetchAdminStats } from "@/lib/api";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface RiderData {
  id: string; user_id: string; user_name: string; phone: string; license_number: string;
  license_photo: string; citizenship_photo_front: string; citizenship_photo_back: string;
  vehicle_type: string; vehicle_number: string; vehicle_photo: string;
  current_latitude: number | null; current_longitude: number | null;
  is_online: boolean; is_approved: boolean; rating: number; total_rides: number; created_at: string;
  acceptance_rate: number; cancellation_rate: number; avg_response_time: number;
  late_arrival_count: number; rude_reports: number; behavior_score: number; behavior_tier: string;
  notes: string; gender: string; gender_verified: boolean; id_document_match: boolean;
}

const tiers = ["platinum", "gold", "silver", "bronze", "probation"];


const emptyRider: Omit<RiderData, "id" | "created_at"> = {
  user_id: "", user_name: "", phone: "", license_number: "", license_photo: "", citizenship_photo_front: "",
  citizenship_photo_back: "", vehicle_type: "", vehicle_number: "", vehicle_photo: "",
  current_latitude: null, current_longitude: null, is_online: false, is_approved: false,
  rating: 5.0, total_rides: 0, acceptance_rate: 100, cancellation_rate: 0, avg_response_time: 0,
  late_arrival_count: 0, rude_reports: 0, behavior_score: 100, behavior_tier: "silver",
  notes: "", gender: "male", gender_verified: false, id_document_match: false,
};

const advFilterFields: FilterField[] = [
  { key: "vehicle_type", label: "Vehicle Type", type: "select", options: [] },
  { key: "behavior_tier", label: "Behavior Tier", type: "select", options: tiers.map(t => ({ label: t, value: t })) },
  { key: "rating", label: "Rating", type: "number" },
  { key: "total_rides", label: "Total Rides", type: "number" },
  { key: "gender", label: "Gender", type: "select", options: [{ label: "Male", value: "male" }, { label: "Female", value: "female" }] },
  { key: "is_approved", label: "Approved Only", type: "boolean" },
  { key: "is_online", label: "Online Only", type: "boolean" },
  { key: "created_at", label: "Joined Date", type: "date_range" },
];

export default function RiderList() {
  const [riders, setRiders] = useState<RiderData[]>([]);
  const { data } = useAdminResource<any>("riders", { page_size: 200 });
  const { data: vehicleTypesData } = useQuery({
    queryKey: ["admin-resource", "vehicle_types"],
    queryFn: () => fetchAdminResource<any>("vehicle_types", { page_size: 100 }),
    staleTime: 60_000,
  });
  const vehicleTypes: { id: string; name: string }[] = vehicleTypesData?.results ?? [];
  const createMutation = useCreateResource("riders");
  const updateMutation = useUpdateResource("riders");
  const deleteMutation = useDeleteResource("riders");
  const [selectedRider, setSelectedRider] = useState<RiderData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRider, setEditingRider] = useState<Partial<RiderData> & typeof emptyRider>(emptyRider);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RiderData | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationTarget, setLocationTarget] = useState<RiderData | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  // Live stats for the stats bar
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "riders"],
    queryFn: () => fetchAdminStats("riders"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // Sub-data for the selected rider's detail drawer
  const riderId = selectedRider?.id;
  const riderUserId = selectedRider?.user_id;
  const { data: dispatchData } = useQuery({
    queryKey: ["rider-dispatch", riderId],
    queryFn: () => fetchAdminResource<any>("dispatch_events", { rider: riderId!, page_size: 20, ordering: "-notified_at" }),
    enabled: !!riderId,
  });
  const { data: riderWalletTxnData } = useQuery({
    queryKey: ["rider-wallet-txns", riderUserId],
    queryFn: () => fetchAdminResource<any>("wallet_transactions", { "wallet__user": riderUserId!, page_size: 20, ordering: "-created_at" }),
    enabled: !!riderUserId,
  });

  useEffect(() => {
    if (!data?.results) return;
    const mapped: RiderData[] = data.results.map((r: any) => ({
      id: r.id,
      user_id: r.user || "",
      user_name: r.user_full_name || r.user || "Unknown",
      phone: r.user_phone || "",
      license_number: r.license_number || "",
      license_photo: r.license_photo || "",
      citizenship_photo_front: r.citizenship_photo_front || "",
      citizenship_photo_back: r.citizenship_photo_back || "",
      vehicle_type: r.vehicle_type || "",
      vehicle_number: r.vehicle_number || "",
      vehicle_photo: r.vehicle_photo || "",
      current_latitude: r.current_latitude ? Number(r.current_latitude) : null,
      current_longitude: r.current_longitude ? Number(r.current_longitude) : null,
      is_online: Boolean(r.is_online),
      is_approved: Boolean(r.is_approved),
      rating: Number(r.rating || 0),
      total_rides: Number(r.total_rides || 0),
      created_at: r.created_at ? String(r.created_at).slice(0, 10) : "",
      acceptance_rate: Number(r.acceptance_rate || 100),
      cancellation_rate: Number(r.cancellation_rate || 0),
      avg_response_time: Number(r.avg_response_time || 0),
      late_arrival_count: Number(r.late_arrival_count || 0),
      rude_reports: Number(r.rude_reports || 0),
      behavior_score: Number(r.behavior_score || 100),
      behavior_tier: r.behavior_tier || "silver",
      notes: r.notes || "",
      gender: r.gender || "male",
      gender_verified: Boolean(r.gender_verified),
      id_document_match: Boolean(r.id_document_match),
    }));
    setRiders(mapped);
  }, [data?.results]);

  const filtered = riders.filter(r => {
    if (searchQ) { const q = searchQ.toLowerCase(); if (!r.user_name.toLowerCase().includes(q) && !r.phone.includes(q) && !r.vehicle_number.toLowerCase().includes(q)) return false; }
    if (activeStatus === "online" && !r.is_online) return false;
    if (activeStatus === "offline" && r.is_online) return false;
    if (activeStatus === "approved" && !r.is_approved) return false;
    if (activeStatus === "pending" && r.is_approved) return false;
    if (advFilters.vehicle_type && r.vehicle_type !== advFilters.vehicle_type) return false;
    if (advFilters.behavior_tier && r.behavior_tier !== advFilters.behavior_tier) return false;
    if (advFilters.gender && r.gender !== advFilters.gender) return false;
    if (advFilters.is_approved && !r.is_approved) return false;
    if (advFilters.is_online && !r.is_online) return false;
    return true;
  });

  const handleCreate = () => { setEditingRider({ ...emptyRider, vehicle_type: vehicleTypes[0]?.id ?? "" }); setIsEditing(false); setFormOpen(true); };
  const handleEdit = (rider: RiderData) => { setEditingRider({ ...rider }); setIsEditing(true); setFormOpen(true); };
  const handleSave = () => {
    if (!editingRider.user_id) { toast.error("Please select a user"); return; }
    if (!editingRider.license_number) { toast.error("License number is required"); return; }
    // Remap user_id -> user so the backend FK remapping picks it up correctly
    const { user_id, user_name, phone, ...rest } = editingRider as any;
    const payload: Record<string, any> = { ...rest, user: user_id };
    if (isEditing && editingRider.id) {
      updateMutation.mutate({ id: editingRider.id, data: payload }, { onSuccess: () => { toast.success("Rider updated"); setFormOpen(false); } });
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Rider created"); setFormOpen(false); } });
    }
  };
  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, { onSuccess: () => {
        toast.success("Rider deleted"); setDeleteOpen(false); setDeleteTarget(null);
        if (selectedRider?.id === deleteTarget.id) { setDrawerOpen(false); setSelectedRider(null); }
      }});
    }
  };

  const columns: Column<RiderData>[] = [
    { key: "id", label: "ID", render: r => <span className="font-mono text-xs font-semibold text-primary">{r.id}</span> },
    { key: "user_name", label: "Name", render: r => (<div className="flex items-center gap-2.5"><div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary">{r.user_name.split(" ").map(n => n[0]).join("")}</div><div><span className="font-medium text-sm block">{r.user_name}</span><span className="text-[10px] text-muted-foreground font-mono">{r.phone}</span></div></div>) },
    { key: "vehicle_type", label: "Vehicle", render: r => <span>{vehicleTypes.find(vt => vt.id === r.vehicle_type)?.name || r.vehicle_type || "—"}</span> },
    { key: "vehicle_number", label: "Vehicle No", render: r => <span className="font-mono text-xs">{r.vehicle_number}</span> },
    { key: "rating", label: "Rating", render: r => <span className="font-semibold">⭐ {r.rating}</span> },
    { key: "behavior_tier", label: "Tier", render: r => <StatusBadge status={r.behavior_tier === "platinum" ? "active" : r.behavior_tier === "gold" ? "accepted" : r.behavior_tier === "probation" ? "cancelled" : "pending"} /> },
    { key: "is_online", label: "Status", render: r => <StatusBadge status={r.is_online ? "online" : "offline"} pulse={r.is_online} /> },
    { key: "is_approved", label: "Approved", render: r => <StatusBadge status={r.is_approved ? "approved" : "pending"} /> },
    { key: "total_rides", label: "Rides", render: r => <span className="font-mono">{r.total_rides.toLocaleString()}</span> },
  ];

  return (
    <>
      <ModulePage title="Rider Profiles" subtitle="Manage all rider partners" createLabel="Add Rider"
        onCreate={handleCreate} onRowClick={(r: RiderData) => { setSelectedRider(r); setDrawerOpen(true); }}
        stats={[
          { label: "Total Riders", value: statsData?.total ?? riders.length },
          { label: "Online Now", value: statsData?.bool_counts.is_online ?? riders.filter(r => r.is_online).length, pulse: true },
          { label: "Pending Approval", value: statsData ? (statsData.total - (statsData.bool_counts.is_approved ?? 0)) : riders.filter(r => !r.is_approved).length },
          { label: "Approved", value: statsData?.bool_counts.is_approved ?? riders.filter(r => r.is_approved).length },
          { label: "Avg Rating", value: riders.length > 0 ? (riders.reduce((s, r) => s + r.rating, 0) / riders.length).toFixed(2) : "—" },
          { label: "New Today", value: statsData?.today ?? 0 },
        ]}
        statusFilters={[{ label: "All", value: "all" }, { label: "Online", value: "online" }, { label: "Offline", value: "offline" }, { label: "Approved", value: "approved" }, { label: "Pending", value: "pending" }]}
        activeStatus={activeStatus} onStatusChange={setActiveStatus} onSearch={setSearchQ}
        searchPlaceholder="Search name, phone, vehicle..." columns={columns} data={filtered}
        advancedFilterFields={advFilterFields} advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters} onAdvancedFilterClear={() => setAdvFilters({})}
      />

      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selectedRider?.user_name || ""} subtitle={selectedRider?.id}>
        {selectedRider && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => { handleEdit(selectedRider); setDrawerOpen(false); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="outline" onClick={() => { setLocationTarget(selectedRider); setLocationOpen(true); }}><MapPin className="h-3.5 w-3.5 mr-1" /> Live Location</Button>
              <Button size="sm" variant={selectedRider.is_approved ? "outline" : "default"}>
                <Shield className="h-3.5 w-3.5 mr-1" /> {selectedRider.is_approved ? "Suspend" : "Approve"}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selectedRider); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            </div>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="behavior">Behavior</TabsTrigger>
                <TabsTrigger value="gender">Gender</TabsTrigger>
                <TabsTrigger value="earnings">Earnings</TabsTrigger>
                <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Name" value={selectedRider.user_name} />
                  <InfoField label="Phone" value={selectedRider.phone} />
                  <InfoField label="License" value={selectedRider.license_number} />
                  <InfoField label="Vehicle" value={vehicleTypes.find(vt => vt.id === selectedRider.vehicle_type)?.name || selectedRider.vehicle_type} />
                  <InfoField label="Vehicle No" value={selectedRider.vehicle_number} />
                  <InfoField label="Rating" value={`⭐ ${selectedRider.rating}`} />
                  <InfoField label="Rides" value={selectedRider.total_rides.toLocaleString()} />
                  <InfoField label="Joined" value={selectedRider.created_at} />
                </div>
                <Separator />
                <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Documents</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ label: "License Photo", url: selectedRider.license_photo }, { label: "Citizenship Front", url: selectedRider.citizenship_photo_front },
                    { label: "Citizenship Back", url: selectedRider.citizenship_photo_back }, { label: "Vehicle Photo", url: selectedRider.vehicle_photo }].map(doc => (
                    <div key={doc.label} className="rounded-lg border bg-muted/20 overflow-hidden">
                      {doc.url ? <img src={doc.url} className="w-full h-24 object-cover" /> : <div className="p-4 text-center text-xs text-muted-foreground aspect-[4/3] flex items-center justify-center">{doc.label}<br/>Not uploaded</div>}
                      <p className="text-[10px] text-muted-foreground text-center py-1">{doc.label}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="behavior" className="space-y-4 mt-4">
                <div className="grid grid-cols-3 gap-3">
                  <ScoreCard label="Score" value={selectedRider.behavior_score} suffix="/100" color={selectedRider.behavior_score > 80 ? "text-emerald-600" : "text-amber-600"} />
                  <ScoreCard label="Accept %" value={selectedRider.acceptance_rate} suffix="%" color="text-emerald-600" />
                  <ScoreCard label="Cancel %" value={selectedRider.cancellation_rate} suffix="%" color="text-rose-600" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Avg Response" value={`${selectedRider.avg_response_time}s`} />
                  <InfoField label="Late Arrivals" value={String(selectedRider.late_arrival_count)} />
                  <InfoField label="Rude Reports" value={String(selectedRider.rude_reports)} />
                  <InfoField label="Tier" value={selectedRider.behavior_tier} />
                </div>
                {selectedRider.notes && <div className="p-3 rounded-lg border bg-muted/20"><p className="text-xs text-muted-foreground mb-1">Notes</p><p className="text-sm">{selectedRider.notes}</p></div>}
              </TabsContent>
              <TabsContent value="gender" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Gender" value={selectedRider.gender} />
                  <InfoField label="Verified" value={selectedRider.gender_verified ? "Yes" : "No"} />
                  <InfoField label="ID Match" value={selectedRider.id_document_match ? "Yes" : "No"} />
                </div>
                {selectedRider.gender === "female" && !selectedRider.gender_verified && <Button size="sm"><Shield className="h-3.5 w-3.5 mr-1" /> Verify for Female-Only</Button>}
              </TabsContent>
              <TabsContent value="earnings" className="space-y-4 mt-4">
                <div className="rounded-lg border p-4 bg-muted/20">
                  <p className="text-xs text-muted-foreground">Recent Wallet Transactions</p>
                  <p className="text-sm text-muted-foreground mt-1">{riderWalletTxnData?.count ?? 0} total records</p>
                </div>
                {riderWalletTxnData?.results?.length ? (
                  <MiniTable headers={["Type", "Amount", "Source", "Date"]} rows={riderWalletTxnData.results.map((t: any) => [
                    <StatusBadge status={t.transaction_type === "credit" ? "success" : "completed"} />,
                    <span className="font-mono">Rs. {t.amount}</span>,
                    t.source || "—",
                    t.created_at ? String(t.created_at).slice(0, 10) : "—",
                  ])} />
                ) : <p className="text-xs text-muted-foreground py-4 text-center">No wallet transactions found.</p>}
              </TabsContent>
              <TabsContent value="dispatch" className="space-y-4 mt-4">
                {dispatchData?.results?.length ? (
                  <MiniTable headers={["Response", "Ride", "Score", "Time"]} rows={dispatchData.results.map((d: any) => [
                    <StatusBadge status={d.response === "accepted" ? "accepted" : d.response === "rejected" ? "cancelled" : "pending"} />,
                    <span className="font-mono text-xs text-primary">{String(d.ride_booking || "—").slice(0, 8)}</span>,
                    d.score_at_dispatch != null ? Number(d.score_at_dispatch).toFixed(2) : "—",
                    d.notified_at ? String(d.notified_at).slice(0, 16).replace("T", " ") : "—",
                  ])} />
                ) : <p className="text-xs text-muted-foreground py-4 text-center">No dispatch events found.</p>}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DetailDrawer>

      {/* Live Location Dialog */}
      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Live Location — {locationTarget?.user_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border overflow-hidden" style={{ height: 300 }}>
              {locationTarget?.current_latitude && locationTarget?.current_longitude && (
                <MapContainer
                  center={[locationTarget.current_latitude, locationTarget.current_longitude]}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[locationTarget.current_latitude, locationTarget.current_longitude]} />
                </MapContainer>
              )}
            </div>
            <p className="font-mono text-xs text-muted-foreground text-center">{locationTarget?.current_latitude?.toFixed(6)}, {locationTarget?.current_longitude?.toFixed(6)}</p>
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="Status" value={locationTarget?.is_online ? "Online" : "Offline"} />
              <InfoField label="Last Updated" value="Just now" />
            </div>
            <a href={`https://www.google.com/maps?q=${locationTarget?.current_latitude},${locationTarget?.current_longitude}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline block text-center">Open in Google Maps →</a>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEditing ? "Edit Rider" : "Add Rider"}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal Info</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <UserSearchField
                    value={editingRider.user_id}
                    displayName={editingRider.user_name}
                    onChange={(id, name) => setEditingRider(p => ({ ...p, user_id: id, user_name: name }))}
                    disabled={isEditing}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Gender</Label>
                  <Select value={editingRider.gender} onValueChange={v => setEditingRider(p => ({ ...p, gender: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">License & Documents</h4>
              <div className="grid grid-cols-2 gap-4">
                <FF label="License Number *" value={editingRider.license_number} onChange={v => setEditingRider(p => ({ ...p, license_number: v }))} />
                <div />
                <ImagePickerField label="License Photo" value={editingRider.license_photo} onChange={v => setEditingRider(p => ({ ...p, license_photo: v }))} />
                <ImagePickerField label="Citizenship Front" value={editingRider.citizenship_photo_front} onChange={v => setEditingRider(p => ({ ...p, citizenship_photo_front: v }))} />
                <ImagePickerField label="Citizenship Back" value={editingRider.citizenship_photo_back} onChange={v => setEditingRider(p => ({ ...p, citizenship_photo_back: v }))} />
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Vehicle</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Vehicle Type</Label>
                  <Select value={editingRider.vehicle_type} onValueChange={v => setEditingRider(p => ({ ...p, vehicle_type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select vehicle type" /></SelectTrigger>
                    <SelectContent>{vehicleTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <FF label="Vehicle Number" value={editingRider.vehicle_number} onChange={v => setEditingRider(p => ({ ...p, vehicle_number: v }))} placeholder="BA X PA XXXX" />
                <ImagePickerField label="Vehicle Photo" value={editingRider.vehicle_photo} onChange={v => setEditingRider(p => ({ ...p, vehicle_photo: v }))} />
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border"><Label className="text-sm">Online</Label><Switch checked={editingRider.is_online} onCheckedChange={v => setEditingRider(p => ({ ...p, is_online: v }))} /></div>
                <div className="flex items-center justify-between p-3 rounded-lg border"><Label className="text-sm">Approved</Label><Switch checked={editingRider.is_approved} onCheckedChange={v => setEditingRider(p => ({ ...p, is_approved: v }))} /></div>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Behavior</h4>
              <div className="grid grid-cols-2 gap-4">
                <FF label="Behavior Score" value={String(editingRider.behavior_score)} onChange={v => setEditingRider(p => ({ ...p, behavior_score: parseFloat(v) || 0 }))} type="number" />
                <div className="space-y-1.5">
                  <Label className="text-sm">Tier</Label>
                  <Select value={editingRider.behavior_tier} onValueChange={v => setEditingRider(p => ({ ...p, behavior_tier: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{tiers.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3"><Label className="text-sm">Admin Notes</Label><Textarea value={editingRider.notes} onChange={e => setEditingRider(p => ({ ...p, notes: e.target.value }))} className="mt-1.5" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isEditing ? "Save" : "Add Rider"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Rider" description={`Delete "${deleteTarget?.user_name}"?`} onConfirm={handleDelete} destructive />
    </>
  );
}

function InfoField({ label, value }: { label: string; value: string }) { return (<div className="space-y-0.5"><span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{label}</span><p className="text-sm font-medium">{value || "—"}</p></div>); }
function FF({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) { return (<div className="space-y-1.5"><Label className="text-sm">{label}</Label><Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>); }
function ScoreCard({ label, value, suffix, color }: { label: string; value: number; suffix: string; color: string }) { return (<div className="rounded-lg border p-3 bg-muted/20 text-center"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p><p className={`text-2xl font-bold font-mono ${color}`}>{value}<span className="text-xs">{suffix}</span></p></div>); }
function MiniTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) { return (<div className="rounded-lg border overflow-hidden"><table className="w-full text-xs"><thead><tr className="bg-muted/30 border-b">{headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="border-b last:border-0">{row.map((cell, j) => <td key={j} className="px-3 py-2">{cell}</td>)}</tr>)}</tbody></table></div>); }

