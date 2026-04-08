import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchAdminMapEntities, type MapEntity } from "@/lib/api";

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
  { key: "parcel_agent", label: "Parcel Agents", emoji: "📦", color: "hsl(38 92% 50%)" },
  { key: "vendor", label: "E-com Vendors", emoji: "🏪", color: "hsl(199 89% 48%)" },
  { key: "restaurant", label: "Restaurants", emoji: "🍽️", color: "hsl(347 77% 50%)" },
  { key: "room_lister", label: "Room Listings", emoji: "🏠", color: "hsl(280 60% 55%)" },
] as const;

const DEFAULT_CENTER: [number, number] = [27.7172, 85.324];

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) {
      map.setView(DEFAULT_CENTER, 12);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    const b = L.latLngBounds(points);
    map.fitBounds(b, { padding: [48, 48], maxZoom: 15 });
  }, [map, points]);
  return null;
}

interface GodEyeMapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GodEyeMap({ open, onOpenChange }: GodEyeMapProps) {
  const [filters, setFilters] = useState<Record<string, boolean>>(
    () => Object.fromEntries(ENTITY_TYPES.map((t) => [t.key, true])) as Record<string, boolean>,
  );

  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["admin-map-entities"],
    queryFn: fetchAdminMapEntities,
    enabled: open,
    refetchInterval: open ? 25_000 : false,
    staleTime: 10_000,
  });

  const entities: MapEntity[] = data?.entities ?? [];

  const icons = useMemo(
    () => Object.fromEntries(ENTITY_TYPES.map((t) => [t.key, createSvgIcon(t.emoji, t.color)])),
    [],
  );

  const visibleEntities = entities.filter((e) => filters[e.type] && icons[e.type as keyof typeof icons]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    ENTITY_TYPES.forEach((t) => {
      c[t.key] = entities.filter((e) => e.type === t.key).length;
    });
    return c;
  }, [entities]);

  const points: [number, number][] = useMemo(
    () => visibleEntities.map((e) => [e.lat, e.lng]),
    [visibleEntities],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
            <span className="text-xl">👁️</span> God Eye — live map
            <Badge variant="secondary" className="text-[10px]">
              {visibleEntities.length} on map
              {isFetching ? " · updating…" : ""}
            </Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-normal pr-8">
            Rider and parcel positions update from the API when available. Restaurants, vendors, and rooms show registered
            locations.
          </p>
        </DialogHeader>

        <div className="flex h-[75vh]">
          <div className="w-56 shrink-0 border-r p-4 space-y-3 overflow-y-auto bg-muted/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layers</p>
            {ENTITY_TYPES.map((type) => (
              <div
                key={type.key}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{type.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{type.label}</p>
                    <p className="text-[10px] text-muted-foreground">{counts[type.key] ?? 0}</p>
                  </div>
                </div>
                <Switch
                  checked={filters[type.key] ?? true}
                  onCheckedChange={(v) => setFilters((p) => ({ ...p, [type.key]: v }))}
                  className="scale-75 shrink-0"
                />
              </div>
            ))}

            {isError ? (
              <p className="text-xs text-destructive">
                {error instanceof Error ? error.message : "Could not load map data."}
                <button type="button" className="block mt-1 underline" onClick={() => refetch()}>
                  Retry
                </button>
              </p>
            ) : null}

            {!isError && !isFetching && entities.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No coordinates in the database yet. Riders and parcel agents appear when their apps report location.
              </p>
            ) : null}
          </div>

          <div className="flex-1 relative">
            <MapContainer center={DEFAULT_CENTER} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds points={points} />
              {visibleEntities.map((entity, i) => {
                const icon = icons[entity.type as keyof typeof icons];
                if (!icon) return null;
                return (
                  <Marker key={`${entity.type}-${entity.name}-${i}`} position={[entity.lat, entity.lng]} icon={icon}>
                    <Popup>
                      <div className="text-xs space-y-1 min-w-[140px]">
                        <p className="font-semibold text-sm">{entity.name}</p>
                        <p className="text-muted-foreground capitalize">{entity.type.replace(/_/g, " ")}</p>
                        <p>{entity.detail}</p>
                        <p
                          className="capitalize font-medium"
                          style={{
                            color:
                              entity.status === "online" ||
                              entity.status === "active" ||
                              entity.status === "open" ||
                              entity.status === "listed"
                                ? "hsl(160 84% 39%)"
                                : "hsl(215 16% 47%)",
                          }}
                        >
                          ● {entity.status}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
