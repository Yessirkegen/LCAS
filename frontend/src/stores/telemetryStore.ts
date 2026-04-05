import { create } from "zustand";

interface TelemetryData {
  [key: string]: any;
}

interface HealthIndex {
  value: number;
  letter: string;
  category: string;
  top_factors: Array<{ param: string; value: number; score: number; weight: number; impact: number }>;
  penalties_applied: Array<{ event: string; penalty: number }>;
  predicted_minutes_to_critical?: number;
}

interface Alert {
  id: string;
  locomotive_id: string;
  level: string;
  param: string;
  message: string;
  voice_text?: string;
  value?: number;
  threshold?: number;
  status: string;
  timestamp: string;
}

interface HistoryPoint {
  time: string;
  [key: string]: any;
}

interface TelemetryStore {
  data: TelemetryData | null;
  healthIndex: HealthIndex | null;
  alerts: Alert[];
  acknowledgedParams: Set<string>;
  history: HistoryPoint[];

  update: (msg: any) => void;
  setInitial: (state: any, health: any, alerts: any[]) => void;
  acknowledgeAll: () => void;
  clearHistory: () => void;
}

const MAX_HISTORY = 300;
const HISTORY_FIELDS = [
  "speed_kmh", "water_temp_inlet", "water_temp_outlet",
  "oil_temp_inlet", "oil_temp_outlet", "water_pressure_kpa",
  "oil_pressure_kpa", "main_reservoir_pressure", "brake_line_pressure",
  "traction_current", "generator_voltage", "fuel_level",
  "fuel_consumption", "catenary_voltage", "pantograph_current",
  "inverter_temp", "ted_avg_temp", "ted_max_temp",
  "cooling_water_temp", "regen_power_kw",
];

let _pendingMsg: any = null;
let _flushTimer: ReturnType<typeof setTimeout> | null = null;
const THROTTLE_MS = 400;

function buildHistoryPoint(d: any, hi: any): HistoryPoint {
  const pt: HistoryPoint = { time: d.timestamp || new Date().toISOString(), health_index: hi?.value };
  for (let i = 0; i < HISTORY_FIELDS.length; i++) {
    const k = HISTORY_FIELDS[i];
    if (d[k] != null) pt[k] = d[k];
  }
  return pt;
}

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  data: null,
  healthIndex: null,
  alerts: [],
  acknowledgedParams: new Set<string>(),
  history: [],

  setInitial: (state: any, health: any, alerts: any[]) => {
    const hist: HistoryPoint[] = [];
    if (state) hist.push(buildHistoryPoint(state, health));
    set({
      data: state || null,
      healthIndex: health || null,
      alerts: alerts || [],
      history: hist,
    });
  },

  update: (msg: any) => {
    if (msg.type !== "telemetry") return;
    _pendingMsg = msg;

    if (_flushTimer) return;
    _flushTimer = setTimeout(() => {
      _flushTimer = null;
      const m = _pendingMsg;
      if (!m) return;
      _pendingMsg = null;

      const state = get();
      const acked = state.acknowledgedParams;
      const incoming: Alert[] = m.alerts || [];

      const merged = incoming.length > 0
        ? incoming.map((a: Alert) => acked.has(a.param) ? { ...a, status: "acknowledged" } : a)
        : state.alerts;

      const d = m.data || {};
      const pt = buildHistoryPoint(d, m.health_index);
      const hist = state.history.length >= MAX_HISTORY
        ? [...state.history.slice(-(MAX_HISTORY - 1)), pt]
        : [...state.history, pt];

      set({
        data: m.data || state.data,
        healthIndex: m.health_index || state.healthIndex,
        alerts: merged,
        history: hist,
      });
    }, THROTTLE_MS);
  },

  acknowledgeAll: () => {
    const state = get();
    const newAcked = new Set(state.acknowledgedParams);
    state.alerts.forEach((a) => {
      if (a.level === "WARNING") newAcked.add(a.param);
    });
    set({
      alerts: state.alerts.map((a) => ({ ...a, status: "acknowledged" })),
      acknowledgedParams: newAcked,
    });
  },

  clearHistory: () => set({ history: [] }),
}));
