import { create } from "zustand";

export interface LocoSummary {
  locomotive_id: string;
  health_index: number | null;
  hi_letter: string;
  hi_category: string;
  speed_kmh: number | null;
  lat: number | null;
  lon: number | null;
  alert_count: number;
}

export interface FleetStats {
  total: number;
  normal: number;
  attention: number;
  critical: number;
}

interface FleetStore {
  locoMap: Record<string, LocoSummary>;
  stats: FleetStats;
  dataVersion: number;

  updateFromWs: (msg: any) => void;
  setFleet: (list: any[]) => void;
}

const FLUSH_MS = 2000;
let _buf: Record<string, any> = {};
let _timer: ReturnType<typeof setTimeout> | null = null;

export const useFleetStore = create<FleetStore>((set, get) => ({
  locoMap: {},
  stats: { total: 0, normal: 0, attention: 0, critical: 0 },
  dataVersion: 0,

  updateFromWs: (msg: any) => {
    if (msg.type !== "fleet_update") return;

    _buf[msg.locomotive_id] = {
      locomotive_id: msg.locomotive_id,
      health_index: msg.health_index,
      hi_letter: msg.hi_letter,
      hi_category: msg.hi_category,
      speed_kmh: msg.speed,
      lat: msg.lat,
      lon: msg.lon,
      alert_count: msg.alert_count || 0,
    };

    if (_timer) return;
    _timer = setTimeout(() => {
      _timer = null;
      const s = get();
      const merged = { ...s.locoMap, ..._buf };
      _buf = {};

      let normal = 0, attention = 0, critical = 0;
      const keys = Object.keys(merged);
      for (let i = 0; i < keys.length; i++) {
        const c = merged[keys[i]].hi_category;
        if (c === "normal") normal++;
        else if (c === "attention") attention++;
        else critical++;
      }

      set({
        locoMap: merged,
        stats: { total: keys.length, normal, attention, critical },
        dataVersion: s.dataVersion + 1,
      });
    }, FLUSH_MS);
  },

  setFleet: (list: any[]) => {
    const map: Record<string, LocoSummary> = {};
    let normal = 0, attention = 0, critical = 0;
    for (const l of list) {
      map[l.locomotive_id] = {
        locomotive_id: l.locomotive_id,
        health_index: l.health_index,
        hi_letter: l.hi_letter || "",
        hi_category: l.hi_category || "normal",
        speed_kmh: l.speed_kmh,
        lat: l.lat,
        lon: l.lon,
        alert_count: l.alert_count || 0,
      };
      const c = l.hi_category || "normal";
      if (c === "normal") normal++;
      else if (c === "attention") attention++;
      else critical++;
    }
    set({
      locoMap: map,
      stats: { total: list.length, normal, attention, critical },
      dataVersion: 1,
    });
  },
}));
