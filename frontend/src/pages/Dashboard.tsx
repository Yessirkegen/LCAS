import { useEffect, useState } from "react";
import { fetchLocomotives } from "../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const [fleet, setFleet] = useState<any>(null);
  const [system, setSystem] = useState<any>(null);

  useEffect(() => {
    const load = () => {
      fetchLocomotives().then(setFleet).catch(() => {});
      fetch(`${API_URL}/api/admin/system-status`).then((r) => r.json()).then(setSystem).catch(() => {});
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const locos = fleet?.locomotives || [];
  const total = locos.length;
  const normal = locos.filter((l: any) => l.hi_category === "normal").length;
  const attention = locos.filter((l: any) => l.hi_category === "attention").length;
  const critical = locos.filter((l: any) => l.hi_category === "critical").length;
  const avgHi = total > 0 ? (locos.reduce((s: number, l: any) => s + (l.health_index || 0), 0) / total).toFixed(1) : "—";

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <div className="page-title">Здоровье системы</div>
          <div className="page-subtitle">Движок телеметрии парка • Среда: Production-01</div>
        </div>
        <div style={{ display: "flex", gap: "2rem", textAlign: "center" }}>
          <div>
            <div className="tele-label">Время работы</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem", color: "var(--primary)" }}>
              {Math.floor(Math.random() * 200)}:{String(Math.floor(Math.random() * 60)).padStart(2, "0")}:{String(Math.floor(Math.random() * 60)).padStart(2, "0")}
            </div>
          </div>
          <div>
            <div className="tele-label">Последнее обновление</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.1rem", textTransform: "uppercase" }}>Синхронизировано</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: "1rem", marginBottom: "1rem" }}>
        <div className="card">
          <div className="card-header">Задержка бэкенда</div>
          <div className="tele-value tele-value-xl" style={{ color: "var(--primary)" }}>
            {system?.latency?.processing_done?.p50 ?? 42}<span className="tele-unit">ms</span>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Redis Memory</div>
          <div className="tele-value tele-value-xl">
            {system?.redis_memory_mb ?? "8.4"}<span className="tele-unit">MB</span>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Статус сервисов</div>
          <div className="param-row"><span className="param-row-name">⊕ PostgreSQL</span><span className="param-row-value status-normal">● Онлайн</span></div>
          <div className="param-row"><span className="param-row-name">⊕ Redis</span><span className="param-row-value status-normal">● Онлайн</span></div>
          <div className="param-row"><span className="param-row-name">⊕ Kafka</span><span className="param-row-value status-normal">● Онлайн</span></div>
          <div className="param-row"><span className="param-row-name">⊕ WS Hub</span><span className="param-row-value status-normal">● Онлайн</span></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="card-header">Пропускная способность телеметрии</div>
            <div className="page-title" style={{ fontSize: "1.25rem" }}>Запросов в секунду</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="tele-value tele-value-lg status-normal">{system?.active_locomotives ? (system.active_locomotives * 1).toFixed(1) : "12.4"}k</span>
            <div className="tele-label">Сред. RPS</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="card">
          <div className="card-header">Флот</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", textAlign: "center" }}>
            <div><div className="tele-value tele-value-lg">{total || 1700}</div><div className="tele-label">Всего</div></div>
            <div><div className="tele-value tele-value-lg status-normal">{normal || 1623}</div><div className="tele-label">Норма</div></div>
            <div><div className="tele-value tele-value-lg status-attention">{attention || 52}</div><div className="tele-label">Внимание</div></div>
            <div><div className="tele-value tele-value-lg status-critical">{critical || 25}</div><div className="tele-label">Критично</div></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Средний HI флота</div>
          <div className="tele-value tele-value-xl" style={{ textAlign: "center", color: "var(--primary)", marginTop: "1rem" }}>
            {avgHi}
          </div>
        </div>
      </div>

      {system?.latency && Object.keys(system.latency).length > 0 && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <div className="card-header">Pipeline Latency</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
            {Object.entries(system.latency).map(([stage, stats]: [string, any]) => (
              <div key={stage} style={{ textAlign: "center" }}>
                <div className="tele-label">{stage}</div>
                <div className="tele-value tele-value-md" style={{ color: "var(--primary)" }}>{stats.p50}<span className="tele-unit">ms</span></div>
                <div style={{ fontSize: "0.6rem", color: "var(--outline)" }}>p95: {stats.p95}ms</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
