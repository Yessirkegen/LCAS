import { useEffect, useState } from "react";
import { fetchLocomotives } from "../services/api";

interface Loco {
  locomotive_id: string;
  health_index: number | null;
  hi_category: string;
  speed_kmh: number | null;
}

interface Props {
  onSelect: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  normal: "var(--primary)",
  attention: "var(--secondary-container)",
  critical: "var(--error)",
};

export default function LocoPicker({ onSelect }: Props) {
  const [locos, setLocos] = useState<Loco[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      fetchLocomotives()
        .then((r) => { setLocos(r.locomotives || []); setLoading(false); })
        .catch(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loco-picker">
      <div className="loco-picker-header">
        <div className="loco-picker-icon">🚂</div>
        <h2 className="loco-picker-title">Выбор локомотива</h2>
        <p className="loco-picker-subtitle">
          Выберите тепловоз для мониторинга в режиме кабины
        </p>
      </div>

      {loading && locos.length === 0 && (
        <div className="loco-picker-empty">Загрузка флота...</div>
      )}

      {!loading && locos.length === 0 && (
        <div className="loco-picker-empty">
          <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⚠</div>
          Нет активных локомотивов. Запустите симулятор.
        </div>
      )}

      <div className="loco-picker-grid">
        {locos.map((loco) => {
          const color = CATEGORY_COLORS[loco.hi_category] || CATEGORY_COLORS.normal;
          return (
            <button
              key={loco.locomotive_id}
              className={`loco-picker-card ${loco.hi_category}`}
              onClick={() => onSelect(loco.locomotive_id)}
            >
              <div className="loco-picker-card-top">
                <span className="loco-picker-dot" style={{ background: color }} />
                <span className="loco-picker-id">{loco.locomotive_id}</span>
              </div>

              <div className="loco-picker-hi" style={{ color }}>
                {loco.health_index ?? "—"}
              </div>
              <div className="loco-picker-hi-label">Health Index</div>

              <div className="loco-picker-speed">
                {loco.speed_kmh?.toFixed(0) ?? "—"} <span>km/h</span>
              </div>

              <div className="loco-picker-action">
                Подключиться →
              </div>
            </button>
          );
        })}
      </div>

      <div className="loco-picker-footer">
        <span>● {locos.length} активных тепловозов</span>
        <span>Обновляется автоматически</span>
      </div>
    </div>
  );
}
