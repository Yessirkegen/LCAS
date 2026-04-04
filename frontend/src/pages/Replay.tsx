import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchTelemetryHistory } from "../services/api";
import TrendChart from "../components/TrendChart";
import ParamCard from "../components/ParamCard";

export default function Replay() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [history, setHistory] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [minutes, setMinutes] = useState(5);
  const intervalRef = useRef<number>();

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
        if (prev >= history.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1000 / speed);
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, history.length]);

  const current = history[currentIdx] || {};
  const visibleHistory = history.slice(0, currentIdx + 1);
  const progress = history.length > 0 ? (currentIdx / (history.length - 1)) * 100 : 0;

  return (
    <div className="page replay-page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Назад</button>
        <h2>Replay — {id}</h2>
        <span className="replay-badge">REPLAY MODE</span>
      </header>

      <div className="replay-controls">
        <div className="replay-timeline">
          <input
            type="range"
            min={0}
            max={Math.max(0, history.length - 1)}
            value={currentIdx}
            onChange={(e) => setCurrentIdx(Number(e.target.value))}
            className="timeline-slider"
          />
          <div className="timeline-labels">
            <span>{history[0]?.time ? new Date(history[0].time).toLocaleTimeString("ru-RU") : "—"}</span>
            <span>{current.time ? new Date(current.time).toLocaleTimeString("ru-RU") : "—"}</span>
            <span>{history[history.length - 1]?.time ? new Date(history[history.length - 1].time).toLocaleTimeString("ru-RU") : "—"}</span>
          </div>
        </div>

        <div className="replay-buttons">
          <button onClick={() => setCurrentIdx(0)}>⏮</button>
          <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 10))}>⏪</button>
          <button onClick={() => setPlaying(!playing)} className="play-btn">
            {playing ? "⏸" : "▶"}
          </button>
          <button onClick={() => setCurrentIdx(Math.min(history.length - 1, currentIdx + 10))}>⏩</button>
          <button onClick={() => setCurrentIdx(history.length - 1)}>⏭</button>

          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="speed-select">
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
          </select>

          <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="period-select">
            <option value={5}>5 мин</option>
            <option value={15}>15 мин</option>
            <option value={60}>1 час</option>
          </select>
        </div>
      </div>

      <div className="replay-data">
        <div className="replay-params">
          <div className="widget">
            <h3>Текущий кадр ({currentIdx + 1} / {history.length})</h3>
            <div className="params-grid">
              <ParamCard label="HI" value={current.health_index} precision={0} />
              <ParamCard label="Скорость" value={current.speed_kmh} unit="км/ч" precision={0} />
              <ParamCard label="Вода вых" value={current.water_temp_outlet} unit="°C" />
              <ParamCard label="Масло вых" value={current.oil_temp_outlet} unit="°C" />
              <ParamCard label="Давл масла" value={current.oil_pressure_kpa} unit="кПа" precision={0} />
              <ParamCard label="Топливо" value={current.fuel_level} unit="%" />
            </div>
          </div>
        </div>

        <div className="replay-chart widget" style={{ gridColumn: "1 / -1" }}>
          <h3>Тренд за период</h3>
          <TrendChart
            history={visibleHistory.map((h) => ({
              time: h.time,
              health_index: h.health_index,
              water_temp_outlet: h.water_temp_outlet,
              oil_temp_outlet: h.oil_temp_outlet,
            }))}
            fields={[
              { key: "health_index", name: "Health Index", color: "#22c55e" },
              { key: "water_temp_outlet", name: "Темп воды", color: "#3b82f6" },
              { key: "oil_temp_outlet", name: "Темп масла", color: "#f59e0b" },
            ]}
            height={250}
          />
        </div>
      </div>
    </div>
  );
}
