import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LocoPoint {
  locomotive_id: string;
  lat: number | null;
  lon: number | null;
  health_index: number | null;
  hi_category: string;
  speed_kmh: number | null;
}

interface Props {
  locomotives: LocoPoint[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  normal: "#22c55e",
  attention: "#eab308",
  critical: "#ef4444",
};

export default function FleetMap({ locomotives, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [71.45, 51.17],
      zoom: 5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const currentIds = new Set(locomotives.map((l) => l.locomotive_id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    for (const loco of locomotives) {
      if (!loco.lat || !loco.lon) continue;

      const color = CATEGORY_COLORS[loco.hi_category] || CATEGORY_COLORS.normal;
      const isSelected = loco.locomotive_id === selectedId;

      let marker = markersRef.current.get(loco.locomotive_id);

      if (marker) {
        marker.setLngLat([loco.lon, loco.lat]);
        const el = marker.getElement();
        el.style.background = color;
        el.style.border = isSelected ? "3px solid white" : "2px solid rgba(0,0,0,0.3)";
        el.style.width = isSelected ? "16px" : "12px";
        el.style.height = isSelected ? "16px" : "12px";
      } else {
        const el = document.createElement("div");
        el.style.width = "12px";
        el.style.height = "12px";
        el.style.borderRadius = "50%";
        el.style.background = color;
        el.style.border = "2px solid rgba(0,0,0,0.3)";
        el.style.cursor = "pointer";
        el.onclick = () => onSelect?.(loco.locomotive_id);

        const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
          <div style="font-size:12px;color:#111">
            <b>${loco.locomotive_id}</b><br>
            HI: ${loco.health_index ?? "—"}<br>
            ${loco.speed_kmh?.toFixed(0) ?? "—"} км/ч
          </div>
        `);

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([loco.lon, loco.lat])
          .setPopup(popup)
          .addTo(mapRef.current!);

        markersRef.current.set(loco.locomotive_id, marker);
      }
    }
  }, [locomotives, selectedId, onSelect]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 350, borderRadius: "0.5rem" }} />;
}
