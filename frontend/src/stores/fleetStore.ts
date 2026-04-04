import { create } from "zustand";

interface LocoSummary {
  locomotive_id: string;
  health_index: number | null;
  hi_letter: string;
  hi_category: string;
  speed_kmh: number | null;
  lat: number | null;
  lon: number | null;
  alert_count: number;
  last_seen: number;
}

interface FleetStore {
  locomotives: Map<string, LocoSummary>;
  stats: { total: number; normal: number; attention: number; critical: number };

  updateFromWs: (msg: any) => void;
  setFleet: (list: LocoSummary[]) => void;
}

export const useFleetStore = create<FleetStore>((set, get) => ({
  locomotives: new Map(),
  stats: { total: 0, normal: 0, attention: 0, critical: 0 },

  updateFromWs: (msg: any) => {
    if (msg.type !== "fleet_update") return;
    const state = get();
    const updated = new Map(state.locomotives);
    updated.set(msg.locomotive_id, {
      locomotive_id: msg.locomotive_id,
      health_index: msg.health_index,
      hi_letter: msg.hi_letter,
      hi_category: msg.hi_category,
      speed_kmh: msg.speed,
      lat: msg.lat,
      lon: msg.lon,
      alert_count: msg.alert_count || 0,
      last_seen: Date.now(),
    });
    const locos = Array.from(updated.values());
    set({
      locomotives: updated,
      stats: {
        total: locos.length,
        normal: locos.filter((l) => l.hi_category === "normal").length,
        attention: locos.filter((l) => l.hi_category === "attention").length,
        critical: locos.filter((l) => l.hi_category === "critical").length,
      },
    });
  },

  setFleet: (list: LocoSummary[]) => {
    const map = new Map(list.map((l) => [l.locomotive_id, l]));
    set({
      locomotives: map,
      stats: {
        total: list.length,
        normal: list.filter((l) => l.hi_category === "normal").length,
        attention: list.filter((l) => l.hi_category === "attention").length,
        critical: list.filter((l) => l.hi_category === "critical").length,
      },
    });
  },
}));
