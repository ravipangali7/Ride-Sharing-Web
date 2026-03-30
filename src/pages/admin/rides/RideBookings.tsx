import { useEffect, useState } from "react";
import { ModulePage } from "@/components/admin/ModulePage";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Column } from "@/components/admin/DataTable";
import { DetailDrawer } from "@/components/admin/DetailDrawer";
import { FilterField } from "@/components/admin/AdvancedFilterDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { MapPickerField } from "@/components/admin/MapPickerField";
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
import { Edit, Trash2, MapPin, Navigation, MessageSquare, Star, Calculator, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAdminResource } from "@/hooks/useAdminResource";
import { useCreateResource, useUpdateResource, useDeleteResource } from "@/hooks/useAdminMutations";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminResource, fetchAdminStats } from "@/lib/api";
import { UserSearchField } from "@/components/admin/UserSearchField";
import { EntitySearchField } from "@/components/admin/EntitySearchField";

// ── Geo utilities ──
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const pickupIcon = L.divIcon({ html: '<div style="width:24px;height:24px;border-radius:50%;background:hsl(160 84% 39%);display:flex;align-items:center;justify-content:center;font-size:12px;color:white;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">P</div>', className: "", iconSize: [24, 24], iconAnchor: [12, 12] });
const dropIcon = L.divIcon({ html: '<div style="width:24px;height:24px;border-radius:50%;background:hsl(347 77% 50%);display:flex;align-items:center;justify-content:center;font-size:12px;color:white;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">D</div>', className: "", iconSize: [24, 24], iconAnchor: [12, 12] });

function RouteMap({ pickup, drop }: { pickup: [number, number]; drop: [number, number] }) {
  const center: [number, number] = [(pickup[0] + drop[0]) / 2, (pickup[1] + drop[1]) / 2];
  return (
    <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
      <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={pickup} icon={pickupIcon} />
      <Marker position={drop} icon={dropIcon} />
    </MapContainer>
  );
}

// ── Types ──
interface RideBookingData {
  id: string;
  customer: string;       // display name
  customer_id: string;    // FK UUID
  rider: string;          // display name
  rider_id: string;       // FK UUID (RiderProfile)
  vehicle_type: string;   // display name
  vehicle_type_id: string; // FK UUID
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  drop_address: string;
  drop_latitude: number;
  drop_longitude: number;
  distance_km: number;
  estimated_fare: number;
  final_fare: number | null;
  bargain_price: number | null;
  status: string;
  booking_type: string;
  is_shared_ride: boolean;
  is_female_only: boolean;
  share_contact: boolean;
  payment_method: string;
  tip_amount: number;
  otp: string | null;
  scheduled_at: string | null;
  created_at: string;
  completed_at: string | null;
}

const statuses = ["searching", "bargaining", "accepted", "arrived", "started", "completed", "cancelled"];
const payments = ["cash", "wallet", "coins", "qr_esewa", "qr_khalti", "qr_ime"];

const emptyRide: Omit<RideBookingData, "id" | "created_at"> = {
  customer: "", customer_id: "", rider: "", rider_id: "", vehicle_type: "", vehicle_type_id: "",
  pickup_address: "", pickup_latitude: 27.7172, pickup_longitude: 85.324,
  drop_address: "", drop_latitude: 27.7172, drop_longitude: 85.324,
  distance_km: 0, estimated_fare: 0, final_fare: null, bargain_price: null, status: "searching",
  booking_type: "app", is_shared_ride: false, is_female_only: false, share_contact: true,
  payment_method: "cash", tip_amount: 0, otp: null, scheduled_at: null, completed_at: null,
};

const ridePayments = ["cash", "wallet", "coins", "qr_esewa", "qr_khalti", "qr_ime"];

export default function RideBookings() {
  const [rides, setRides] = useState<RideBookingData[]>([]);
  const { data } = useAdminResource<any>("ride_bookings", { page_size: 200 });
  const createMutation = useCreateResource("ride_bookings");
  const updateMutation = useUpdateResource("ride_bookings");
  const deleteMutation = useDeleteResource("ride_bookings");
  const [selectedRide, setSelectedRide] = useState<RideBookingData | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRide, setEditingRide] = useState<Partial<RideBookingData> & typeof emptyRide>(emptyRide);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RideBookingData | null>(null);
  const [advFilters, setAdvFilters] = useState<Record<string, any>>({});
  const [searchQ, setSearchQ] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");

  const [isGeocodingPickup, setIsGeocodingPickup] = useState(false);
  const [isGeocodingDrop, setIsGeocodingDrop] = useState(false);

  const { data: vehicleTypesData } = useQuery({
    queryKey: ["admin-resource", "vehicle_types"],
    queryFn: () => fetchAdminResource<any>("vehicle_types", { page_size: 100 }),
    staleTime: 60_000,
  });
  const vehicleTypes: { id: string; name: string; base_fare: number; per_km_rate: number }[] =
    vehicleTypesData?.results ?? [];

  const rideAdvFilterFields: FilterField[] = [
    { key: "vehicle_type", label: "Vehicle Type", type: "select", options: vehicleTypes.map(vt => ({ label: vt.name, value: vt.id })) },
    { key: "payment_method", label: "Payment", type: "select", options: ridePayments.map(p => ({ label: p.replace("_", " "), value: p })) },
    { key: "booking_type", label: "Booking Type", type: "select", options: [{ label: "App", value: "app" }, { label: "Manual Call", value: "manual_call" }] },
    { key: "is_shared_ride", label: "Shared Rides Only", type: "boolean" },
    { key: "is_female_only", label: "Female Only", type: "boolean" },
    { key: "distance_km", label: "Distance (km)", type: "number" },
    { key: "estimated_fare", label: "Fare (Rs)", type: "number" },
  ];

  // Live stats for the stats bar
  const { data: statsData } = useQuery({
    queryKey: ["admin-stats", "ride_bookings"],
    queryFn: () => fetchAdminStats("ride_bookings"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  // Sub-data for selected ride detail drawer
  const rideId = selectedRide?.id;
  const { data: bargainData } = useQuery({
    queryKey: ["ride-bargains", rideId],
    queryFn: () => fetchAdminResource<any>("ride_bargains", { ride: rideId!, page_size: 20, ordering: "-created_at" }),
    enabled: !!rideId,
  });
  const { data: ratingData } = useQuery({
    queryKey: ["ride-ratings", rideId],
    queryFn: () => fetchAdminResource<any>("ride_ratings", { ride: rideId!, page_size: 5 }),
    enabled: !!rideId,
  });

  useEffect(() => {
    if (!data?.results) return;
    const mapped: RideBookingData[] = data.results.map((r: any) => ({
      id: r.id,
      customer: r.customer_full_name || "",
      customer_id: r.customer || "",
      rider: r.rider_user_name || "",
      rider_id: r.rider || "",
      vehicle_type: r.vehicle_type_name || "",
      vehicle_type_id: r.vehicle_type || "",
      pickup_address: r.pickup_address || "",
      pickup_latitude: Number(r.pickup_latitude || 0),
      pickup_longitude: Number(r.pickup_longitude || 0),
      drop_address: r.drop_address || "",
      drop_latitude: Number(r.drop_latitude || 0),
      drop_longitude: Number(r.drop_longitude || 0),
      distance_km: Number(r.distance_km || 0),
      estimated_fare: Number(r.estimated_fare || 0),
      final_fare: r.final_fare != null ? Number(r.final_fare) : null,
      bargain_price: r.bargain_price != null ? Number(r.bargain_price) : null,
      status: r.status || "searching",
      booking_type: r.booking_type || "app",
      is_shared_ride: Boolean(r.is_shared_ride),
      is_female_only: Boolean(r.is_female_only),
      share_contact: Boolean(r.share_contact),
      payment_method: r.payment_method || "cash",
      tip_amount: Number(r.tip_amount || 0),
      otp: r.otp || null,
      scheduled_at: r.scheduled_at || null,
      created_at: r.created_at ? String(r.created_at).slice(0, 19).replace("T", " ") : "",
      completed_at: r.completed_at || null,
    }));
    setRides(mapped);
  }, [data?.results]);

  const filteredRides = rides.filter(r => {
    if (searchQ) { const q = searchQ.toLowerCase(); if (!r.id.toLowerCase().includes(q) && !r.customer.toLowerCase().includes(q) && !(r.rider || "").toLowerCase().includes(q)) return false; }
    if (activeStatus !== "all" && r.status !== activeStatus) return false;
    if (advFilters.vehicle_type && r.vehicle_type !== advFilters.vehicle_type) return false;
    if (advFilters.payment_method && r.payment_method !== advFilters.payment_method) return false;
    if (advFilters.booking_type && r.booking_type !== advFilters.booking_type) return false;
    if (advFilters.is_shared_ride && !r.is_shared_ride) return false;
    if (advFilters.is_female_only && !r.is_female_only) return false;
    return true;
  });

  const handleCreate = () => { setEditingRide({ ...emptyRide, vehicle_type_id: vehicleTypes[0]?.id ?? "", vehicle_type: vehicleTypes[0]?.name ?? "" }); setIsEditing(false); setFormOpen(true); };
  const handleEdit = (ride: RideBookingData) => { setEditingRide({ ...ride }); setIsEditing(true); setFormOpen(true); };

  const handlePickupLocationChange = async (lat: number, lng: number) => {
    setEditingRide(p => {
      const dist = haversineKm(lat, lng, p.drop_latitude, p.drop_longitude);
      return { ...p, pickup_latitude: lat, pickup_longitude: lng, distance_km: parseFloat(dist.toFixed(2)) };
    });
    setIsGeocodingPickup(true);
    const address = await reverseGeocode(lat, lng);
    setIsGeocodingPickup(false);
    if (address) setEditingRide(p => ({ ...p, pickup_address: address }));
  };

  const handleDropLocationChange = async (lat: number, lng: number) => {
    setEditingRide(p => {
      const dist = haversineKm(p.pickup_latitude, p.pickup_longitude, lat, lng);
      return { ...p, drop_latitude: lat, drop_longitude: lng, distance_km: parseFloat(dist.toFixed(2)) };
    });
    setIsGeocodingDrop(true);
    const address = await reverseGeocode(lat, lng);
    setIsGeocodingDrop(false);
    if (address) setEditingRide(p => ({ ...p, drop_address: address }));
  };

  // Auto-calculate estimated fare when distance or vehicle type changes
  useEffect(() => {
    if (!formOpen) return;
    const vt = vehicleTypes.find(v => v.id === editingRide.vehicle_type_id);
    if (!vt) return;
    const fare = Number(vt.base_fare) + editingRide.distance_km * Number(vt.per_km_rate);
    setEditingRide(p => ({ ...p, estimated_fare: parseFloat(fare.toFixed(2)) }));
  }, [editingRide.distance_km, editingRide.vehicle_type_id, formOpen]);

  const handleSave = () => {
    if (!editingRide.customer_id) { toast.error("Customer is required"); return; }
    if (!editingRide.pickup_address || !editingRide.drop_address) { toast.error("Pickup and drop are required"); return; }
    if (!editingRide.vehicle_type_id) { toast.error("Vehicle type is required"); return; }
    // Strip display-only fields; send FK UUIDs under model field names
    const { customer, customer_id, rider, rider_id, vehicle_type, vehicle_type_id, created_at, completed_at, ...rest } = editingRide as any;
    const payload: Record<string, any> = {
      ...rest,
      customer: customer_id,
      vehicle_type: vehicle_type_id,
      ...(rider_id ? { rider: rider_id } : {}),
    };
    if (isEditing && editingRide.id) {
      updateMutation.mutate({ id: editingRide.id, data: payload }, { onSuccess: () => { toast.success("Ride updated"); setFormOpen(false); } });
    } else {
      createMutation.mutate(payload, { onSuccess: () => { toast.success("Ride created"); setFormOpen(false); } });
    }
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, { onSuccess: () => {
        toast.success(`Ride ${deleteTarget.id} deleted`);
        setDeleteOpen(false); setDeleteTarget(null);
        if (selectedRide?.id === deleteTarget.id) { setDrawerOpen(false); setSelectedRide(null); }
      }});
    }
  };

  const columns: Column<RideBookingData>[] = [
    { key: "id", label: "Booking ID", render: r => <span className="font-mono text-xs font-semibold text-primary">{r.id}</span> },
    { key: "customer", label: "Customer" },
    { key: "rider", label: "Rider", render: r => <span className={r.rider ? "" : "text-muted-foreground"}>{r.rider || "Unassigned"}</span> },
    { key: "vehicle_type", label: "Vehicle", render: r => <span>{r.vehicle_type || vehicleTypes.find(vt => vt.id === r.vehicle_type_id)?.name || "—"}</span> },
    { key: "route", label: "Route", render: r => (
      <div className="text-xs max-w-[180px]">
        <div className="truncate">{r.pickup_address}</div>
        <div className="text-muted-foreground truncate">→ {r.drop_address}</div>
      </div>
    )},
    { key: "estimated_fare", label: "Fare", render: r => (
      <div className="font-mono text-sm">
        <span className="font-semibold">Rs. {r.final_fare || r.estimated_fare}</span>
        {r.final_fare && r.final_fare !== r.estimated_fare && <span className="text-[10px] text-muted-foreground ml-1">(est. {r.estimated_fare})</span>}
      </div>
    )},
    { key: "status", label: "Status", render: r => <StatusBadge status={r.status} pulse={r.status === "started" || r.status === "searching"} /> },
    { key: "payment_method", label: "Payment", render: r => <Badge variant="secondary" className="text-[10px] capitalize">{r.payment_method.replace("_", " ")}</Badge> },
    { key: "distance_km", label: "Distance", render: r => <span className="font-mono text-xs">{r.distance_km} km</span> },
    { key: "created_at", label: "Created" },
  ];

  return (
    <>
      <ModulePage
        title="Ride Bookings"
        subtitle="Monitor all ride bookings"
        createLabel="Create Ride"
        onCreate={handleCreate}
        onRowClick={(r: RideBookingData) => { setSelectedRide(r); setDrawerOpen(true); }}
        stats={[
          { label: "Total Rides", value: statsData?.total ?? rides.length },
          { label: "Live Rides", value: statsData ? ((statsData.by_status.started || 0) + (statsData.by_status.arrived || 0) + (statsData.by_status.accepted || 0)) : rides.filter(r => ["started", "arrived", "accepted"].includes(r.status)).length, pulse: true },
          { label: "Completed", value: statsData?.by_status.completed ?? rides.filter(r => r.status === "completed").length },
          { label: "Cancelled", value: statsData?.by_status.cancelled ?? rides.filter(r => r.status === "cancelled").length },
          { label: "Avg Fare", value: rides.length > 0 ? `Rs. ${Math.floor(rides.reduce((s, r) => s + r.estimated_fare, 0) / rides.length)}` : "Rs. 0" },
          { label: "Revenue", value: statsData?.total_amount != null ? `Rs. ${(statsData.total_amount / 1000).toFixed(1)}K` : `Rs. ${(rides.filter(r => r.final_fare).reduce((s, r) => s + (r.final_fare || 0), 0) / 1000).toFixed(1)}K` },
        ]}
        statusFilters={[
          { label: "All", value: "all" }, { label: "Searching", value: "searching" }, { label: "Bargaining", value: "bargaining" },
          { label: "Accepted", value: "accepted" }, { label: "Started", value: "started" },
          { label: "Completed", value: "completed" }, { label: "Cancelled", value: "cancelled" },
        ]}
        activeStatus={activeStatus} onStatusChange={setActiveStatus} onSearch={setSearchQ}
        searchPlaceholder="Search booking ID, customer, rider..."
        columns={columns}
        data={filteredRides}
        advancedFilterFields={rideAdvFilterFields} advancedFilters={advFilters}
        onAdvancedFilterApply={setAdvFilters} onAdvancedFilterClear={() => setAdvFilters({})}
      />

      {/* ── Detail Drawer ── */}
      <DetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title={selectedRide?.id || ""} subtitle={`${selectedRide?.customer} → ${selectedRide?.rider || "Unassigned"}`}>
        {selectedRide && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={selectedRide.status} pulse={selectedRide.status === "started"} />
              <Button size="sm" variant="outline" onClick={() => { handleEdit(selectedRide); setDrawerOpen(false); }}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => { setDeleteTarget(selectedRide); setDeleteOpen(true); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            </div>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="route">Route</TabsTrigger>
                <TabsTrigger value="bargain">Bargain</TabsTrigger>
                <TabsTrigger value="rating">Rating</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <InfoField label="Customer" value={selectedRide.customer} />
                  <InfoField label="Rider" value={selectedRide.rider || "Unassigned"} />
                  <InfoField label="Vehicle Type" value={selectedRide.vehicle_type} />
                  <InfoField label="Booking Type" value={selectedRide.booking_type} />
                  <InfoField label="Distance" value={`${selectedRide.distance_km} km`} />
                  <InfoField label="Estimated Fare" value={`Rs. ${selectedRide.estimated_fare}`} />
                  <InfoField label="Final Fare" value={selectedRide.final_fare ? `Rs. ${selectedRide.final_fare}` : "—"} />
                  <InfoField label="Bargain Price" value={selectedRide.bargain_price ? `Rs. ${selectedRide.bargain_price}` : "—"} />
                  <InfoField label="Payment Method" value={selectedRide.payment_method.replace("_", " ")} />
                  <InfoField label="Tip Amount" value={`Rs. ${selectedRide.tip_amount}`} />
                  <InfoField label="OTP" value={selectedRide.otp || "—"} />
                  <InfoField label="Created" value={selectedRide.created_at} />
                </div>
                <Separator />
                <div className="flex gap-4 flex-wrap">
                  <FlagBadge label="Shared Ride" active={selectedRide.is_shared_ride} />
                  <FlagBadge label="Female Only" active={selectedRide.is_female_only} />
                  <FlagBadge label="Share Contact" active={selectedRide.share_contact} />
                  {selectedRide.scheduled_at && <FlagBadge label={`Scheduled: ${selectedRide.scheduled_at}`} active />}
                </div>
              </TabsContent>

              <TabsContent value="route" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-3 w-3 rounded-full bg-emerald border-2 border-emerald/30" />
                      <div className="w-0.5 h-12 bg-border" />
                      <div className="h-3 w-3 rounded-full bg-rose border-2 border-rose/30" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Pickup</p>
                        <p className="text-sm font-medium">{selectedRide.pickup_address}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{selectedRide.pickup_latitude.toFixed(6)}, {selectedRide.pickup_longitude.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Drop-off</p>
                        <p className="text-sm font-medium">{selectedRide.drop_address}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{selectedRide.drop_latitude.toFixed(6)}, {selectedRide.drop_longitude.toFixed(6)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border overflow-hidden" style={{ height: 200 }}>
                    <RouteMap
                      pickup={[selectedRide.pickup_latitude, selectedRide.pickup_longitude]}
                      drop={[selectedRide.drop_latitude, selectedRide.drop_longitude]}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bargain" className="space-y-4 mt-4">
                {selectedRide.bargain_price ? (
                  <div className="rounded-lg border p-4 bg-muted/20">
                    <p className="text-xs text-muted-foreground">Agreed Bargain Price</p>
                    <p className="text-2xl font-bold font-mono">Rs. {selectedRide.bargain_price}</p>
                  </div>
                ) : null}
                <h4 className="text-sm font-semibold">Rider Offers</h4>
                {bargainData?.results?.length ? (
                  <MiniTable headers={["Rider", "Offered", "Status", "Time"]} rows={bargainData.results.map((b: any) => [
                    b.rider_name || String(b.rider || "—").slice(0, 8),
                    <span className="font-mono font-semibold">Rs. {b.offered_price}</span>,
                    <StatusBadge status={b.status} />,
                    b.created_at ? String(b.created_at).slice(0, 16).replace("T", " ") : "—",
                  ])} />
                ) : <p className="text-sm text-muted-foreground py-8 text-center">No bargain offers for this ride.</p>}
              </TabsContent>

              <TabsContent value="rating" className="space-y-4 mt-4">
                {ratingData?.results?.length ? (
                  ratingData.results.map((r: any, idx: number) => (
                    <div key={idx} className="space-y-2 rounded-lg border p-4 bg-muted/20">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} className={`h-5 w-5 ${i < Number(r.rating) ? "text-amber fill-amber" : "text-muted-foreground"}`} />
                        ))}
                        <span className="ml-2 font-bold">{Number(r.rating).toFixed(1)}/5</span>
                      </div>
                      {r.comment && <p className="text-sm">{r.comment}</p>}
                      {Number(r.tip_amount) > 0 && <p className="text-sm font-mono">Tip: Rs. {r.tip_amount}</p>}
                      <p className="text-xs text-muted-foreground">
                        By: {r.rated_by_name || String(r.rated_by || "—").slice(0, 8)}
                        {r.created_at ? ` • ${String(r.created_at).slice(0, 10)}` : ""}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    {selectedRide.status === "completed" ? "No rating submitted yet." : "Rating available after ride completion."}
                  </p>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4 mt-4">
                <div className="space-y-0">
                  {[
                    { status: "searching", time: selectedRide.created_at, label: "Ride Created" },
                    ...(selectedRide.bargain_price ? [{ status: "bargaining", time: "~2m later", label: "Bargaining Started" }] : []),
                    ...(selectedRide.rider ? [{ status: "accepted", time: "~4m later", label: `Accepted by ${selectedRide.rider}` }] : []),
                    ...(["arrived", "started", "completed"].includes(selectedRide.status) ? [{ status: "arrived", time: "~10m later", label: "Rider Arrived at Pickup" }] : []),
                    ...(["started", "completed"].includes(selectedRide.status) ? [{ status: "started", time: "~12m later", label: "Ride Started (OTP verified)" }] : []),
                    ...(selectedRide.status === "completed" ? [{ status: "completed", time: selectedRide.completed_at || "", label: "Ride Completed" }] : []),
                    ...(selectedRide.status === "cancelled" ? [{ status: "cancelled", time: "~3m later", label: "Ride Cancelled" }] : []),
                  ].map((event, i) => (
                    <div key={i} className="flex gap-3 items-start pb-4">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
                        {i < 5 && <div className="w-0.5 h-full bg-border min-h-[20px]" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{event.label}</p>
                        <p className="text-xs text-muted-foreground">{event.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DetailDrawer>

      {/* ── Create / Edit Form Dialog ── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Ride Booking" : "Create Ride Booking"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Customer & Rider</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <UserSearchField
                    value={editingRide.customer_id}
                    displayName={editingRide.customer}
                    onChange={(id, name) => setEditingRide(p => ({ ...p, customer_id: id, customer: name }))}
                    disabled={isEditing}
                    label="Customer"
                  />
                </div>
                <EntitySearchField
                  resource="riders"
                  labelKey="user_full_name"
                  secondaryKey="user_phone"
                  value={editingRide.rider_id}
                  displayName={editingRide.rider}
                  onChange={(id, name) => setEditingRide(p => ({ ...p, rider_id: id, rider: name }))}
                  label="Rider"
                  placeholder="Search rider (optional)…"
                />
                <div className="space-y-1.5">
                  <Label className="text-sm">Vehicle Type <span className="text-destructive">*</span></Label>
                  <Select value={editingRide.vehicle_type_id} onValueChange={v => {
                    const vt = vehicleTypes.find(x => x.id === v);
                    setEditingRide(p => ({ ...p, vehicle_type_id: v, vehicle_type: vt?.name ?? "" }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{vehicleTypes.map(vt => <SelectItem key={vt.id} value={vt.id}>{vt.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Booking Type</Label>
                  <Select value={editingRide.booking_type} onValueChange={v => setEditingRide(p => ({ ...p, booking_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="app">App</SelectItem>
                      <SelectItem value="manual_call">Manual Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pickup Location</h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    Pickup Address *
                    {isGeocodingPickup && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </Label>
                  <Textarea
                    value={editingRide.pickup_address}
                    onChange={e => setEditingRide(p => ({ ...p, pickup_address: e.target.value }))}
                    placeholder={isGeocodingPickup ? "Fetching address…" : "Full address or click map to auto-fill…"}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>
                <MapPickerField
                  label="Pickup Coordinates"
                  latitude={editingRide.pickup_latitude}
                  longitude={editingRide.pickup_longitude}
                  onLocationChange={handlePickupLocationChange}
                />
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Drop-off Location</h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    Drop Address *
                    {isGeocodingDrop && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  </Label>
                  <Textarea
                    value={editingRide.drop_address}
                    onChange={e => setEditingRide(p => ({ ...p, drop_address: e.target.value }))}
                    placeholder={isGeocodingDrop ? "Fetching address…" : "Full address or click map to auto-fill…"}
                    rows={2}
                    className="resize-none text-sm"
                  />
                </div>
                <MapPickerField
                  label="Drop-off Coordinates"
                  latitude={editingRide.drop_latitude}
                  longitude={editingRide.drop_longitude}
                  onLocationChange={handleDropLocationChange}
                />
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fare & Payment</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    Distance (km)
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal gap-0.5">
                      <Calculator className="h-2.5 w-2.5" /> Auto
                    </Badge>
                  </Label>
                  <Input type="number" value={String(editingRide.distance_km)} onChange={e => setEditingRide(p => ({ ...p, distance_km: parseFloat(e.target.value) || 0 }))} step="0.01" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    Estimated Fare (Rs)
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal gap-0.5">
                      <Calculator className="h-2.5 w-2.5" /> Auto
                    </Badge>
                  </Label>
                  <Input type="number" value={String(editingRide.estimated_fare)} onChange={e => setEditingRide(p => ({ ...p, estimated_fare: parseFloat(e.target.value) || 0 }))} step="0.01" />
                </div>
                <FF label="Final Fare (Rs)" value={String(editingRide.final_fare || "")} onChange={v => setEditingRide(p => ({ ...p, final_fare: v ? parseFloat(v) : null }))} type="number" />
                <FF label="Bargain Price (Rs)" value={String(editingRide.bargain_price || "")} onChange={v => setEditingRide(p => ({ ...p, bargain_price: v ? parseFloat(v) : null }))} type="number" />
                <div className="space-y-1.5">
                  <Label className="text-sm">Payment Method</Label>
                  <Select value={editingRide.payment_method} onValueChange={v => setEditingRide(p => ({ ...p, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ridePayments.map(pm => <SelectItem key={pm} value={pm} className="capitalize">{pm.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <FF label="Tip Amount (Rs)" value={String(editingRide.tip_amount)} onChange={v => setEditingRide(p => ({ ...p, tip_amount: parseFloat(v) || 0 }))} type="number" />
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Ride Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Status</Label>
                  <Select value={editingRide.status} onValueChange={v => setEditingRide(p => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <FF label="OTP" value={editingRide.otp || ""} onChange={v => setEditingRide(p => ({ ...p, otp: v || null }))} placeholder="6-digit OTP" />
                <FF label="Scheduled At" value={editingRide.scheduled_at || ""} onChange={v => setEditingRide(p => ({ ...p, scheduled_at: v || null }))} type="datetime-local" />
                <div className="space-y-3 col-span-2">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch checked={editingRide.is_shared_ride} onCheckedChange={v => setEditingRide(p => ({ ...p, is_shared_ride: v }))} />
                      <Label className="text-sm">Shared Ride</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={editingRide.is_female_only} onCheckedChange={v => setEditingRide(p => ({ ...p, is_female_only: v }))} />
                      <Label className="text-sm">Female Only</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={editingRide.share_contact} onCheckedChange={v => setEditingRide(p => ({ ...p, share_contact: v }))} />
                      <Label className="text-sm">Share Contact</Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isEditing ? "Save Changes" : "Create Ride"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Delete Ride Booking" description={`Delete ride "${deleteTarget?.id}"? This cannot be undone.`} onConfirm={handleDelete} destructive />
    </>
  );
}

// ── Helpers ──
function InfoField({ label, value }: { label: string; value: string }) {
  return (<div className="space-y-0.5"><span className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">{label}</span><p className="text-sm font-medium">{value || "—"}</p></div>);
}
function FF({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (<div className="space-y-1.5"><Label className="text-sm">{label}</Label><Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>);
}
function FlagBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <Badge variant={active ? "default" : "secondary"} className={`text-[10px] ${active ? "bg-primary/10 text-primary" : ""}`}>
      {active ? "✓" : "✗"} {label}
    </Badge>
  );
}
function MiniTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-xs">
        <thead><tr className="bg-muted/30 border-b">{headers.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i} className="border-b last:border-0">{row.map((cell, j) => <td key={j} className="px-3 py-2">{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
