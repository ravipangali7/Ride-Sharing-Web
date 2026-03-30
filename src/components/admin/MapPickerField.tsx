import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Crosshair } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface MapPickerFieldProps {
  label?: string;
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
}

function DraggableMarker({ position, onMove }: { position: [number, number]; onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(parseFloat(e.latlng.lat.toFixed(6)), parseFloat(e.latlng.lng.toFixed(6)));
    },
  });
  return <Marker position={position} />;
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.setView([lat, lng], map.getZoom());
  }, [lat, lng]);
  return null;
}

export function MapPickerField({ label, latitude, longitude, onLocationChange }: MapPickerFieldProps) {
  const [lat, setLat] = useState(latitude || 27.7172);
  const [lng, setLng] = useState(longitude || 85.324);

  useEffect(() => { setLat(latitude || 27.7172); setLng(longitude || 85.324); }, [latitude, longitude]);

  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    onLocationChange(newLat, newLng);
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{label}</Label>}
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="number"
          step="0.000001"
          value={lat}
          onChange={e => { const v = parseFloat(e.target.value) || 0; setLat(v); onLocationChange(v, lng); }}
          placeholder="Latitude"
          className="h-8 text-xs font-mono"
        />
        <Input
          type="number"
          step="0.000001"
          value={lng}
          onChange={e => { const v = parseFloat(e.target.value) || 0; setLng(v); onLocationChange(lat, v); }}
          placeholder="Longitude"
          className="h-8 text-xs font-mono"
        />
      </div>
      <div className="rounded-lg overflow-hidden border h-[180px] relative">
        <MapContainer
          center={[lat, lng]}
          zoom={14}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DraggableMarker position={[lat, lng]} onMove={handleMapClick} />
          <RecenterMap lat={lat} lng={lng} />
        </MapContainer>
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-[10px] font-mono text-muted-foreground z-[1000]">
          Click to pick location
        </div>
      </div>
    </div>
  );
}
