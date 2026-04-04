import { create } from "zustand";

interface TelemetryData {
  locomotive_id: string;
  speed_kmh: number;
  health_index: number;
  hi_letter: string;
  hi_category: string;
  water_temp_inlet: number;
  water_temp_outlet: number;
  oil_temp_inlet: number;
  oil_temp_outlet: number;
  air_temp_collector: number;
  fuel_temp: number;
  water_pressure_kpa: number;
  oil_pressure_kpa: number;
  air_pressure_kpa: number;
  air_consumption: number;
  main_reservoir_pressure: number;
  brake_line_pressure: number;
  compressor_active: boolean;
  traction_current: number;
  traction_effort: number;
  ground_fault_power: boolean;
  ground_fault_aux: boolean;
  generator_voltage: number;
  generator_current: number;
  fuel_level: number;
  fuel_consumption: number;
  lat: number;
  lon: number;
  wheel_slip: boolean;
  timestamp: string;
  [key: string]: any;
}

interface HealthIndex {
  value: number;
  letter: string;
  category: string;
  top_factors: Array<{
    param: string;
    value: number;
    score: number;
    weight: number;
    impact: number;
  }>;
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
  history: HistoryPoint[];
  maxHistory: number;

  update: (msg: any) => void;
  clearHistory: () => void;
}

export const useTelemetryStore = create<TelemetryStore>((set, get) => ({
  data: null,
  healthIndex: null,
  alerts: [],
  history: [],
  maxHistory: 300,

  update: (msg: any) => {
    if (msg.type === "telemetry") {
      const state = get();
      const newHistory = [
        ...state.history.slice(-(state.maxHistory - 1)),
        {
          time: msg.data?.timestamp || new Date().toISOString(),
          health_index: msg.health_index?.value,
          speed: msg.data?.speed_kmh,
          water_temp_outlet: msg.data?.water_temp_outlet,
          oil_temp_outlet: msg.data?.oil_temp_outlet,
          oil_pressure_kpa: msg.data?.oil_pressure_kpa,
          fuel_level: msg.data?.fuel_level,
        },
      ];

      set({
        data: msg.data || state.data,
        healthIndex: msg.health_index || state.healthIndex,
        alerts: msg.alerts || state.alerts,
        history: newHistory,
      });
    }
  },

  clearHistory: () => set({ history: [] }),
}));
