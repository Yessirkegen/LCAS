import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Wagon {
  index: number;
  cargo: string;
  weight_tons: number;
}

interface Consist {
  wagon_count: number;
  total_weight_tons: number;
  wagons: Wagon[];
}

const CARGO_COLORS: Record<string, string> = {
  "зерно": "var(--secondary-container)",
  "уголь": "#555",
  "нефтепродукты": "var(--error)",
  "контейнер": "#4488cc",
  "порожний": "var(--outline)",
  "щебень": "#8a7a6a",
  "металл": "#6688aa",
  "лес": "var(--primary)",
};

interface Props {
  locoId: string;
}

export default function ConsistView({ locoId }: Props) {
  const [consist, setConsist] = useState<Consist | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/locomotives/${locoId}/consist`)
      .then((r) => r.json())
      .then(setConsist)
      .catch(() => {});
  }, [locoId]);

  if (!consist) return null;

  const cargoSummary: Record<string, { count: number; weight: number }> = {};
  for (const w of consist.wagons) {
    if (!cargoSummary[w.cargo]) cargoSummary[w.cargo] = { count: 0, weight: 0 };
    cargoSummary[w.cargo].count++;
    cargoSummary[w.cargo].weight += w.weight_tons;
  }

  const sorted = Object.entries(cargoSummary).sort((a, b) => b[1].weight - a[1].weight);
  const avgWeight = consist.wagon_count > 0 ? Math.round(consist.total_weight_tons / consist.wagon_count) : 0;
  const lengthM = Math.round(consist.wagon_count * 14.7 + 21);

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ textAlign: "center" }}>
          <div className="tele-value tele-value-md">{consist.wagon_count}</div>
          <div className="tele-label">Вагонов</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="tele-value tele-value-md">{consist.total_weight_tons.toLocaleString()}</div>
          <div className="tele-label">Масса (т)</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="tele-value tele-value-md">{lengthM}</div>
          <div className="tele-label">Длина (м)</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="tele-value tele-value-md">{avgWeight}</div>
          <div className="tele-label">Сред. ваг (т)</div>
        </div>
      </div>

      {/* Cargo breakdown */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
        {sorted.map(([cargo, data]) => {
          const pct = consist.total_weight_tons > 0 ? (data.weight / consist.total_weight_tons) * 100 : 0;
          const color = CARGO_COLORS[cargo] || "var(--outline)";
          return (
            <div key={cargo} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)", width: "90px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {cargo}
              </span>
              <div style={{ flex: 1, height: "4px", background: "var(--surface-container-highest)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "2px" }} />
              </div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "0.7rem", fontWeight: 600, width: "35px", textAlign: "right" }}>
                {data.count}
              </span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "0.7rem", color: "var(--on-surface-variant)", width: "50px", textAlign: "right" }}>
                {data.weight}т
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
