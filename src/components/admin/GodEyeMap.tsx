import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom colored SVG markers
function createSvgIcon(emoji: string, color: string) {
  return L.divIcon({
    html: `<div style="
      width:36px;height:36px;border-radius:50%;
      background:${color};
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      border:2px solid white;
    ">${emoji}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

const ENTITY_TYPES = [
  { key: "rider", label: "Riders", emoji: "🏍️", color: "hsl(243 75% 59%)" },
  { key: "user", label: "Customers", emoji: "👤", color: "hsl(160 84% 39%)" },
  { key: "parcel_agent", label: "Parcel Agents", emoji: "📦", color: "hsl(38 92% 50%)" },
  { key: "vendor", label: "E-com Vendors", emoji: "🏪", color: "hsl(199 89% 48%)" },
  { key: "restaurant", label: "Restaurants", emoji: "🍽️", color: "hsl(347 77% 50%)" },
  { key: "room_lister", label: "Room Listers", emoji: "🏠", color: "hsl(280 60% 55%)" },
] as const;

// Generate mock entities around Kathmandu
const generateEntities = () => {
  const entities: { type: string; name: string; lat: number; lng: number; status: string; detail: string }[] = [];
  const center = { lat: 27.7172, lng: 85.324 };

  const riderNames = ["Ramesh K.", "Sunil T.", "Bikash R.", "Deepak G.", "Anish M.", "Prakash S.", "Hari B.", "Krishna P.", "Santosh B.", "Dinesh L.", "Ganesh T.", "Mohan K.", "Sagar C.", "Bijay D.", "Rajan B."];
  const userNames = ["Aarav S.", "Priya T.", "Sunita G.", "Rajesh P.", "Anita K.", "Maya S.", "Dipesh A.", "Kabita M.", "Roshan B.", "Sita L."];
  const agentNames = ["Agent Thamel", "Agent Patan", "Agent Balaju", "Agent Koteshwor", "Agent Kirtipur"];
  const vendorNames = ["Tech Hub", "Fashion World", "Green Mart", "Home Plus", "Sports Zone", "Beauty Corner"];
  const restNames = ["Momo House", "Thakali Kitchen", "Pizza Corner", "Burger Joint", "Naan Stop", "Cafe Heights", "Sushi Bar"];
  const roomNames = ["Patan Flat", "Thamel Studio", "Baneshwor 2BHK", "Lazimpat Suite", "Kirtipur Room"];

  riderNames.forEach((n, i) => entities.push({ type: "rider", name: n, lat: center.lat + (Math.random() - 0.5) * 0.06, lng: center.lng + (Math.random() - 0.5) * 0.06, status: i % 3 === 0 ? "offline" : "online", detail: `⭐ ${(4 + Math.random()).toFixed(1)} • ${Math.floor(Math.random() * 2000)} rides` }));
  userNames.forEach(n => entities.push({ type: "user", name: n, lat: center.lat + (Math.random() - 0.5) * 0.05, lng: center.lng + (Math.random() - 0.5) * 0.05, status: "active", detail: `Active now` }));
  agentNames.forEach(n => entities.push({ type: "parcel_agent", name: n, lat: center.lat + (Math.random() - 0.5) * 0.04, lng: center.lng + (Math.random() - 0.5) * 0.04, status: "active", detail: `${Math.floor(Math.random() * 50)} parcels today` }));
  vendorNames.forEach(n => entities.push({ type: "vendor", name: n, lat: center.lat + (Math.random() - 0.5) * 0.04, lng: center.lng + (Math.random() - 0.5) * 0.04, status: "open", detail: `${Math.floor(Math.random() * 100)} products` }));
  restNames.forEach(n => entities.push({ type: "restaurant", name: n, lat: center.lat + (Math.random() - 0.5) * 0.04, lng: center.lng + (Math.random() - 0.5) * 0.04, status: "open", detail: `${Math.floor(Math.random() * 30)} orders today` }));
  roomNames.forEach(n => entities.push({ type: "room_lister", name: n, lat: center.lat + (Math.random() - 0.5) * 0.04, lng: center.lng + (Math.random() - 0.5) * 0.04, status: "listed", detail: `Rs. ${Math.floor(5000 + Math.random() * 15000)}/mo` }));

  return entities;
};

const allEntities = generateEntities();

interface GodEyeMapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GodEyeMap({ open, onOpenChange }: GodEyeMapProps) {
  const [filters, setFilters] = useState<Record<string, boolean>>(
    Object.fromEntries(ENTITY_TYPES.map(t => [t.key, true]))
  );

  const icons = useMemo(() =>
    Object.fromEntries(ENTITY_TYPES.map(t => [t.key, createSvgIcon(t.emoji, t.color)])),
  []);

  const visibleEntities = allEntities.filter(e => filters[e.type]);

  const counts = useMemo(() =>
    Object.fromEntries(ENTITY_TYPES.map(t => [t.key, allEntities.filter(e => e.type === t.key).length])),
  []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="text-xl">👁️</span> God Eye — Live Map Overview
            <Badge variant="secondary" className="text-[10px] ml-2">{visibleEntities.length} entities</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[75vh]">
          {/* Filter sidebar */}
          <div className="w-56 shrink-0 border-r p-4 space-y-3 overflow-y-auto bg-muted/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layers</p>
            {ENTITY_TYPES.map(type => (
              <div key={type.key} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-base">{type.emoji}</span>
                  <div>
                    <p className="text-xs font-medium">{type.label}</p>
                    <p className="text-[10px] text-muted-foreground">{counts[type.key]}</p>
                  </div>
                </div>
                <Switch
                  checked={filters[type.key]}
                  onCheckedChange={v => setFilters(p => ({ ...p, [type.key]: v }))}
                  className="scale-75"
                />
              </div>
            ))}

            <div className="pt-3 border-t space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
              <div className="grid grid-cols-2 gap-2">
                {ENTITY_TYPES.map(t => (
                  <div key={t.key} className="text-center p-2 rounded-lg bg-card border">
                    <p className="text-lg font-bold font-mono">{counts[t.key]}</p>
                    <p className="text-[9px] text-muted-foreground">{t.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 relative">
            <MapContainer
              center={[27.7172, 85.324]}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {visibleEntities.map((entity, i) => (
                <Marker key={`${entity.type}-${i}`} position={[entity.lat, entity.lng]} icon={icons[entity.type]}>
                  <Popup>
                    <div className="text-xs space-y-1 min-w-[140px]">
                      <p className="font-semibold text-sm">{entity.name}</p>
                      <p className="text-muted-foreground capitalize">{entity.type.replace("_", " ")}</p>
                      <p>{entity.detail}</p>
                      <p className="capitalize font-medium" style={{ color: entity.status === "online" || entity.status === "active" || entity.status === "open" ? "hsl(160 84% 39%)" : "hsl(215 16% 47%)" }}>
                        ● {entity.status}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
