import { useEffect, useRef, useState } from "react";
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
  normal: "#75ff9e",
  attention: "#fdd400",
  critical: "#ffb4ab",
};

export default function FleetMap({ locomotives, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const [railwaysLoaded, setRailwaysLoaded] = useState(false);

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
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
            paint: { "raster-saturation": -0.8, "raster-brightness-max": 0.4 },
          },
        ],
      },
      center: [68.0, 48.5],
      zoom: 4.5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      fetch("/geo/kz_railways.json")
        .then((r) => r.json())
        .then((geojson) => {
          map.addSource("kz-railways", { type: "geojson", data: geojson });

          map.addLayer({
            id: "kz-railways-line",
            type: "line",
            source: "kz-railways",
            paint: {
              "line-color": "#75ff9e",
              "line-width": 1.5,
              "line-opacity": 0.5,
            },
          });

          map.addLayer({
            id: "kz-railways-glow",
            type: "line",
            source: "kz-railways",
            paint: {
              "line-color": "#75ff9e",
              "line-width": 4,
              "line-opacity": 0.08,
              "line-blur": 3,
            },
          });

          setRailwaysLoaded(true);
        })
        .catch((e) => console.error("Failed to load railways:", e));

      fetch("/geo/kz_stations.json")
        .then((r) => r.json())
        .then((geojson) => {
          map.addSource("kz-stations", { type: "geojson", data: geojson });

          map.addLayer({
            id: "kz-stations-circle",
            type: "circle",
            source: "kz-stations",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 1, 7, 3, 10, 5],
              "circle-color": "#ffffff",
              "circle-stroke-color": "#75ff9e",
              "circle-stroke-width": 1,
              "circle-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0, 6, 0.5, 8, 1],
            },
          });

          map.addLayer({
            id: "kz-stations-label",
            type: "symbol",
            source: "kz-stations",
            layout: {
              "text-field": ["get", "name"],
              "text-size": 10,
              "text-offset": [0, 1.2],
              "text-anchor": "top",
              "text-font": ["Open Sans Regular"],
            },
            paint: {
              "text-color": "#bacbb9",
              "text-halo-color": "#121416",
              "text-halo-width": 1,
              "text-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 8, 1],
            },
            minzoom: 7,
          });
        })
        .catch((e) => console.error("Failed to load stations:", e));
    });

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
        el.style.border = isSelected ? "3px solid white" : "2px solid rgba(0,0,0,0.5)";
        el.style.width = isSelected ? "16px" : "10px";
        el.style.height = isSelected ? "16px" : "10px";
        el.style.boxShadow = `0 0 ${isSelected ? "12" : "6"}px ${color}`;
      } else {
        const el = document.createElement("div");
        el.style.width = "10px";
        el.style.height = "10px";
        el.style.borderRadius = "50%";
        el.style.background = color;
        el.style.border = "2px solid rgba(0,0,0,0.5)";
        el.style.cursor = "pointer";
        el.style.boxShadow = `0 0 6px ${color}`;
        el.style.transition = "all 0.3s ease";
        el.onclick = () => onSelect?.(loco.locomotive_id);

        const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(`
          <div style="font-family:Space Grotesk,sans-serif;font-size:12px;color:#e1e3de;background:#1a1d20;padding:8px 12px;border-radius:4px;border-left:3px solid ${color}">
            <b>${loco.locomotive_id}</b><br>
            HI: <span style="color:${color};font-weight:700">${loco.health_index ?? "—"}</span><br>
            ${loco.speed_kmh?.toFixed(0) ?? "—"} km/h
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

  return <div ref={containerRef} style={{ width: "100%", height: "100%", minHeight: 350, borderRadius: "var(--radius)" }} />;
}
