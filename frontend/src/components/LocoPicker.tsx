import { useEffect, useState, useMemo } from "react";
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

const PAGE_SIZE = 30;

export default function LocoPicker({ onSelect }: Props) {
  const [locos, setLocos] = useState<Loco[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    fetchLocomotives()
      .then((r) => { setLocos(r.locomotives || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search) return locos;
    const q = search.toLowerCase();
    return locos.filter((l) => l.locomotive_id.toLowerCase().includes(q));
  }, [locos, search]);

  const stats = useMemo(() => {
    let normal = 0, attention = 0, critical = 0;
    for (const l of locos) {
      if (l.hi_category === "normal") normal++;
      else if (l.hi_category === "attention") attention++;
      else critical++;
    }
    return { normal, attention, critical };
  }, [locos]);

  return (
    <div className="loco-picker">
      <div className="loco-picker-header">
        <div className="loco-picker-icon">🚂</div>
        <h2 className="loco-picker-title">Выбор локомотива</h2>
        <p className="loco-picker-subtitle">
          {locos.length} активных | {stats.normal} норма | {stats.attention} внимание | {stats.critical} критично
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

      {locos.length > 0 && (
        <div style={{ marginBottom: "1rem", padding: "0 1rem" }}>
          <input
            type="text"
            placeholder="Поиск по номеру..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setLimit(PAGE_SIZE); }}
            className="dispatch-search"
            style={{ width: "100%", maxWidth: "400px" }}
            autoFocus
          />
        </div>
      )}

      <div className="loco-picker-grid">
        {filtered.slice(0, limit).map((loco) => {
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
              <div className="loco-picker-hi-label">HI</div>
              <div className="loco-picker-speed">
                {loco.speed_kmh?.toFixed(0) ?? "—"} <span>km/h</span>
              </div>
              <div className="loco-picker-action">Войти →</div>
            </button>
          );
        })}
      </div>

      {limit < filtered.length && (
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <button className="scenario-btn" style={{ padding: "0.5rem 2rem" }} onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Показать ещё {Math.min(PAGE_SIZE, filtered.length - limit)} из {filtered.length - limit}
          </button>
        </div>
      )}

      <div className="loco-picker-footer">
        <span>● {filtered.length} тепловозов{search ? ` (найдено)` : ""}</span>
      </div>
    </div>
  );
}
