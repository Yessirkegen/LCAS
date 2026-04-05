import { useEffect, useState } from "react";
import { fetchLocoState } from "../services/api";
import ParamCard from "./ParamCard";

interface Props {
  locoIds: [string, string];
}

export default function LocoComparison({ locoIds }: Props) {
  const [states, setStates] = useState<[any, any]>([null, null]);

  useEffect(() => {
    Promise.all(locoIds.map((id) => fetchLocoState(id).catch(() => null))).then(
      ([a, b]) => setStates([a, b])
    );
    const interval = setInterval(() => {
      Promise.all(locoIds.map((id) => fetchLocoState(id).catch(() => null))).then(
        ([a, b]) => setStates([a, b])
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [locoIds[0], locoIds[1]]);

  const params = [
    { key: "health_index", label: "HI" },
    { key: "speed_kmh", label: "Скорость", unit: "км/ч" },
    { key: "water_temp_outlet", label: "Темп воды", unit: "°C" },
    { key: "oil_temp_outlet", label: "Темп масла", unit: "°C" },
    { key: "oil_pressure_kpa", label: "Давл масла", unit: "кПа" },
    { key: "fuel_level", label: "Топливо", unit: "%" },
    { key: "traction_current", label: "Тяга", unit: "А" },
  ];

  return (
    <div className="comparison-view">
      <div className="comparison-header">
        <span className="comp-id">{locoIds[0]}</span>
        <span className="comp-vs">vs</span>
        <span className="comp-id">{locoIds[1]}</span>
      </div>
      <div className="comparison-grid">
        {params.map((p) => {
          const v1 = states[0]?.state?.[p.key];
          const v2 = states[1]?.state?.[p.key];
          return (
            <div key={p.key} className="comp-row">
              <span className="comp-val">{v1 != null ? Number(v1).toFixed(1) : "—"}</span>
              <span className="comp-label">{p.label}</span>
              <span className="comp-val">{v2 != null ? Number(v2).toFixed(1) : "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
