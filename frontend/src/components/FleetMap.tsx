import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useFleetStore } from "../stores/fleetStore";
import type { LocoSummary } from "../stores/fleetStore";

interface Props {
  selectedId?: string;
  onSelect?: (id: string) => void;
}

const SRC = "fleet";
const LAYER = "fleet-dots";
const LAYER_SEL = "fleet-sel";

function toGeoJSON(locoMap: Record<string, LocoSummary>): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const id in locoMap) {
    const l = locoMap[id];
    if (!l.lat || !l.lon) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [l.lon, l.lat] },
      properties: { id, hi: l.health_index ?? 100, cat: l.hi_category || "normal", spd: l.speed_kmh ?? 0 },
    });
  }
  return { type: "FeatureCollection", features };
}

export default function FleetMap({ selectedId, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const rafRef = useRef(0);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: {
        version: 8,
        sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OSM" } },
        layers: [{ id: "osm", type: "raster", source: "osm", paint: { "raster-saturation": -0.8, "raster-brightness-max": 0.4 } }],
      },
      center: [68, 48.5],
      zoom: 4.5,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      fetch("/geo/kz_railways.json").then(r => r.json()).then(g => {
        map.addSource("rw", { type: "geojson", data: g });
        map.addLayer({ id: "rw-line", type: "line", source: "rw", paint: { "line-color": "#75ff9e", "line-width": 1.5, "line-opacity": 0.5 } });
      }).catch(() => {});

      fetch("/geo/kz_stations.json").then(r => r.json()).then(g => {
        map.addSource("st", { type: "geojson", data: g });
        map.addLayer({ id: "st-c", type: "circle", source: "st", paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 1, 7, 3, 10, 5],
          "circle-color": "#fff", "circle-stroke-color": "#75ff9e", "circle-stroke-width": 1,
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0, 6, 0.5, 8, 1],
        }});
        map.addLayer({ id: "st-l", type: "symbol", source: "st", minzoom: 7, layout: {
          "text-field": ["get", "name"], "text-size": 10, "text-offset": [0, 1.2], "text-anchor": "top", "text-font": ["Open Sans Regular"],
        }, paint: { "text-color": "#bacbb9", "text-halo-color": "#121416", "text-halo-width": 1, "text-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 8, 1] }});
      }).catch(() => {});

      map.addSource(SRC, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: LAYER, type: "circle", source: SRC, paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 8, 6, 12, 9],
        "circle-color": ["match", ["get", "cat"], "normal", "#75ff9e", "attention", "#fdd400", "critical", "#ffb4ab", "#75ff9e"],
        "circle-opacity": 0.85, "circle-stroke-width": 1, "circle-stroke-color": "rgba(0,0,0,0.4)",
      }});
      map.addLayer({ id: LAYER_SEL, type: "circle", source: SRC, filter: ["==", ["get", "id"], ""], paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 7, 8, 11, 12, 15],
        "circle-color": ["match", ["get", "cat"], "normal", "#75ff9e", "attention", "#fdd400", "critical", "#ffb4ab", "#75ff9e"],
        "circle-opacity": 1, "circle-stroke-width": 3, "circle-stroke-color": "#fff",
      }});

      ready.current = true;

      map.on("click", LAYER, (e) => {
        const f = e.features?.[0];
        if (f?.properties?.id) onSelectRef.current?.(f.properties.id);
      });
      map.on("mouseenter", LAYER, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", LAYER, () => { map.getCanvas().style.cursor = ""; popupRef.current?.remove(); });
      map.on("mousemove", LAYER, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as any;
        const coords = (f.geometry as any).coordinates.slice();
        const c = p.cat === "normal" ? "#75ff9e" : p.cat === "attention" ? "#fdd400" : "#ffb4ab";
        if (!popupRef.current) popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
        popupRef.current.setLngLat(coords).setHTML(
          `<div style="font-family:Space Grotesk,sans-serif;font-size:12px;color:#e1e3de;background:#1a1d20;padding:6px 10px;border-radius:4px;border-left:3px solid ${c}"><b>${p.id}</b><br>HI: <span style="color:${c};font-weight:700">${p.hi}</span> | ${Math.round(p.spd)} km/h</div>`
        ).addTo(map);
      });
    });

    return () => { map.remove(); mapRef.current = null; ready.current = false; };
  }, []);

  useEffect(() => {
    const unsub = useFleetStore.subscribe((state, prev) => {
      if (state.dataVersion === prev.dataVersion) return;
      if (!mapRef.current || !ready.current) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const src = mapRef.current?.getSource(SRC) as maplibregl.GeoJSONSource;
        if (src) src.setData(toGeoJSON(state.locoMap));
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!mapRef.current || !ready.current) return;
    mapRef.current.setFilter(LAYER_SEL, ["==", ["get", "id"], selectedId || ""]);
  }, [selectedId]);

  return <div ref={ref} style={{ width: "100%", height: "100%", minHeight: 350, borderRadius: "var(--radius)" }} />;
}
