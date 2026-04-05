import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchTelemetryHistory } from "../services/api";
import TrendChart from "../components/TrendChart";

export default function Replay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [minutes, setMinutes] = useState(5);
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    if (!id) return;
    fetchTelemetryHistory(id, minutes).then((res) => {
      setHistory(res.data || []);
      setCurrentIdx(0);
    }).catch(() => {});
  }, [id, minutes]);

  useEffect(() => {
    if (!playing || history.length === 0) return;
    intervalRef.current = window.setInterval(() => {
      setCurrentIdx((prev) => {
        if (prev >= history.length - 1) { setPlaying(false); return prev; }
        return prev + 1;
      });
    }, 1000 / speed);
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, history.length]);

  const current = history[currentIdx] || {};
  const visibleHistory = history.slice(0, currentIdx + 1);
  const hiValue = current.health_index ?? 0;
  const hiColor = hiValue >= 80 ? "var(--primary)" : hiValue >= 50 ? "var(--secondary-container)" : "var(--error)";

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: hiValue < 50 ? "var(--error-container)" : "var(--surface-container-low)", borderRadius: "var(--radius)", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "1.2rem" }}>⏪</span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", textTransform: "uppercase" }}>
              Режим повтора{hiValue < 50 ? ": Каскадный отказ" : ""}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)" }}>
              Журнал инцидентов • {id}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="tele-label">Время воспроизведения</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem" }}>
            {current.time ? new Date(current.time).toLocaleTimeString("ru-RU") : "—"}
          </div>
        </div>
      </div>

      {/* Gauges row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="card-header">Индекс здоровья системы</div>
          <svg viewBox="0 0 200 180" style={{ maxWidth: "180px", margin: "0 auto" }}>
            <circle cx="100" cy="100" r="70" fill="none" stroke="var(--surface-container-highest)" strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 70 * 0.75} ${2 * Math.PI * 70 * 0.25}`} strokeLinecap="round" transform="rotate(135 100 100)" />
            <circle cx="100" cy="100" r="70" fill="none" stroke={hiColor} strokeWidth="10"
              strokeDasharray={`${(hiValue / 100) * 2 * Math.PI * 70 * 0.75} ${2 * Math.PI * 70}`}
              strokeLinecap="round" transform="rotate(135 100 100)" style={{ transition: "stroke-dasharray 0.5s" }} />
            <text x="100" y="95" textAnchor="middle" fill="var(--on-surface)" fontSize="42" fontWeight="700" fontFamily="Space Grotesk">{Math.round(hiValue)}</text>
            <text x="100" y="125" textAnchor="middle" fill={hiColor} fontSize="12" fontWeight="600" fontFamily="Space Grotesk" style={{ textTransform: "uppercase" }}>
              {hiValue >= 80 ? "Стабильно" : hiValue >= 50 ? "Внимание" : "Критический"}
            </text>
          </svg>
        </div>

        <div className="card" style={{ textAlign: "center" }}>
          <div className="card-header">Скорость тепловоза</div>
          <div className="tele-value tele-value-xl" style={{ marginTop: "1.5rem" }}>
            {current.speed_kmh?.toFixed(1) ?? "—"}
          </div>
          <div className="tele-unit">MPH</div>
        </div>

        <div className="card">
          <div className="card-header">Параметры</div>
          <div className="param-row"><span className="param-row-name">Вода</span><span className="param-row-value">{current.water_temp_outlet?.toFixed(0) ?? "—"}<span className="tele-unit">°C</span></span></div>
          <div className="param-row"><span className="param-row-name">Масло</span><span className="param-row-value">{current.oil_temp_outlet?.toFixed(0) ?? "—"}<span className="tele-unit">°C</span></span></div>
          <div className="param-row"><span className="param-row-name">Давл масла</span><span className="param-row-value">{current.oil_pressure_kpa?.toFixed(0) ?? "—"}<span className="tele-unit">кПа</span></span></div>
          <div className="param-row"><span className="param-row-name">Топливо</span><span className="param-row-value">{current.fuel_level?.toFixed(0) ?? "—"}<span className="tele-unit">%</span></span></div>
        </div>
      </div>

      {/* Chart */}
      <div className="card chart-widget" style={{ marginBottom: "1rem" }}>
        <TrendChart
          history={visibleHistory.map((h) => ({
            time: h.time,
            health_index: h.health_index,
            water_temp_outlet: h.water_temp_outlet,
          }))}
          fields={[
            { key: "health_index", name: "Индекс здоровья", color: "#75ff9e" },
            { key: "water_temp_outlet", name: "Темп воды", color: "#64b5f6" },
          ]}
          height={220}
        />
      </div>

      {/* Timeline Controls (sticky bottom) */}
      <div className="card" style={{ position: "sticky", bottom: 0, zIndex: 50 }}>
        <input
          type="range"
          min={0}
          max={Math.max(0, history.length - 1)}
          value={currentIdx}
          onChange={(e) => setCurrentIdx(Number(e.target.value))}
          className="timeline-slider"
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="tele-label">Скорость</span>
            {[1, 2, 5].map((s) => (
              <button key={s} className={`hl-btn ${speed === s ? "active" : ""}`} onClick={() => setSpeed(s)} style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>{s}x</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.375rem" }}>
            <button className="scenario-btn" onClick={() => setCurrentIdx(0)} style={{ padding: "0.375rem 0.5rem" }}>⏮</button>
            <button className="scenario-btn" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 10))} style={{ padding: "0.375rem 0.5rem" }}>⏪</button>
            <button className="btn-start" onClick={() => setPlaying(!playing)} style={{ padding: "0.375rem 1rem", fontSize: "1.2rem", background: playing ? "var(--on-surface-variant)" : undefined }}>
              {playing ? "⏸" : "▶"}
            </button>
            <button className="scenario-btn" onClick={() => setCurrentIdx(Math.min(history.length - 1, currentIdx + 10))} style={{ padding: "0.375rem 0.5rem" }}>⏩</button>
            <button className="scenario-btn" onClick={() => setCurrentIdx(history.length - 1)} style={{ padding: "0.375rem 0.5rem" }}>⏭</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ textAlign: "right" }}>
              <div className="tele-label">Текущее окно</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem" }}>
                {history[0]?.time ? new Date(history[0].time).toLocaleTimeString("ru-RU") : "—"} - {history[history.length - 1]?.time ? new Date(history[history.length - 1].time).toLocaleTimeString("ru-RU") : "—"}
              </div>
            </div>
            <button className="scenario-btn" style={{ padding: "0.375rem 0.75rem", fontSize: "0.65rem" }} onClick={() => navigate(-1)}>
              🔒 Захват кадра
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
