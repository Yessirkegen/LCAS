import { useState } from "react";
import { startSimulator, stopSimulator, runScenario } from "../services/api";

const SCENARIOS = [
  { id: "overheat_water", name: "Перегрев воды", color: "var(--error)" },
  { id: "overheat_oil", name: "Перегрев масла", color: "var(--error)" },
  { id: "air_leak", name: "Утечка воздуха", color: "var(--secondary-container)" },
  { id: "ground_fault", name: "Каскадный отказ", color: "var(--secondary-container)" },
  { id: "cascade", name: "Разгон-торможение", color: "var(--on-surface-variant)" },
];

export default function Simulator() {
  const [running, setRunning] = useState(false);
  const [locoId, setLocoId] = useState("TE33A-0142");
  const [hz, setHz] = useState(1);
  const [count, setCount] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const addLog = (msg: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString("ru-RU")} ${msg}`, ...prev].slice(0, 20));
  };

  const handleStart = async () => {
    const res = await startSimulator(locoId, hz, count);
    setRunning(true);
    addLog(`Запущено: ${res.locomotives?.length || 1} лок, ${hz} Гц`);
  };

  const handleStop = async () => {
    await stopSimulator();
    setRunning(false);
    setActiveScenario(null);
    addLog("Остановлено");
  };

  const handleScenario = async (id: string, dur = 30) => {
    if (!running) await handleStart();
    setActiveScenario(id);
    await runScenario(locoId, id, dur);
    addLog(`Сценарий: ${id}`);
    setTimeout(() => setActiveScenario(null), dur * 1000);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Пульт управления симулятором</div>
          <div className="page-subtitle">Интерфейс манипуляции телеметрией в реальном времени</div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className={`scenario-btn ${running ? "" : ""}`} style={{ borderColor: running ? "var(--primary)" : undefined, color: running ? "var(--primary)" : undefined }}>
            {running ? "● Ручной" : "Ручной"}
          </button>
          <button className="scenario-btn">Авто-симулятор</button>
          <button className="scenario-btn">Сценарий</button>
          <div style={{ marginLeft: "0.5rem", padding: "0.5rem 0.875rem", background: "var(--surface-container-low)", borderRadius: "var(--radius)", fontFamily: "var(--font-display)", fontSize: "0.8rem" }}>
            {locoId} ▾
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        {/* Movement */}
        <div className="card">
          <div className="card-header"><span className="card-header-icon">✓</span> Движение и динамика</div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
            <div className="tele-value tele-value-lg" style={{ color: "var(--primary)" }}>72.4</div>
            <div className="tele-label">MPH VELOCITY</div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span className="tele-label">0 MPH</span>
            <input type="range" min="0" max="120" defaultValue="72" style={{ flex: 1, accentColor: "var(--primary)" }} />
            <span className="tele-label">120 MPH</span>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
            <span className="tele-label">Боксование</span>
            <button className="scenario-btn" style={{ padding: "0.25rem 0.5rem", fontSize: "0.6rem" }}>OFF</button>
          </div>
        </div>

        {/* Scenarios */}
        <div className="card">
          <div className="card-header"><span className="card-header-icon">🔥</span> Сценарии</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                className={`scenario-btn ${activeScenario === s.id ? "active" : ""}`}
                style={{ borderColor: activeScenario === s.id ? s.color : undefined, color: activeScenario === s.id ? s.color : undefined, fontSize: "0.65rem" }}
                onClick={() => handleScenario(s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
          <button className="scenario-btn" style={{ width: "100%", marginTop: "0.5rem", borderColor: "var(--primary)", color: "var(--primary)" }} onClick={handleStart}>
            Нормальная работа
          </button>
        </div>

        {/* Highload */}
        <div className="card">
          <div className="card-header"><span className="card-header-icon">⚡</span> Высокая нагрузка</div>
          <div className="tele-label">Кол-во виртуальных тепловозов</div>
          <div className="highload-btns" style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
            {[1, 10, 100, 500, 1700].map((n) => (
              <button key={n} className={`hl-btn ${count === n ? "active" : ""}`} onClick={() => setCount(n)}>{n}</button>
            ))}
          </div>
          <div className="sim-actions">
            <button className="btn-start" onClick={async () => { await startSimulator(locoId, hz, count); setRunning(true); addLog(`Highload: ${count}×${hz}Hz = ${count*hz} RPS`); }}>
              Запустить тест
            </button>
            <button className="btn-stop" onClick={handleStop}>Стоп</button>
          </div>
        </div>
      </div>

      {/* Telemetry Stream Log */}
      <div className="card">
        <div className="card-header">
          <span className="card-header-icon">📡</span> Поток телеметрии
          <span style={{ marginLeft: "auto", width: "8px", height: "8px", borderRadius: "50%", background: running ? "var(--primary)" : "var(--outline)", display: "inline-block" }} />
        </div>
        <div className="sim-log">
          {log.length === 0 ? (
            <span className="log-empty">Нет событий</span>
          ) : (
            log.map((entry, i) => <div key={i} className="log-entry">{entry}</div>)
          )}
        </div>
      </div>
    </>
  );
}
