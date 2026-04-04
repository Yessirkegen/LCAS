import { useState } from "react";
import { startSimulator, stopSimulator, runScenario } from "../services/api";

const SCENARIOS = [
  { id: "overheat_water", name: "Перегрев воды", desc: "Температура воды → 116°C за 30 сек", duration: 30 },
  { id: "overheat_oil", name: "Перегрев масла", desc: "Температура масла → 98°C за 30 сек", duration: 30 },
  { id: "air_leak", name: "Утечка воздуха", desc: "Давление ГР падает за 45 сек", duration: 45 },
  { id: "ground_fault", name: "Земля в цепях", desc: "Замыкание силовых цепей", duration: 15 },
  { id: "cascade", name: "Каскадный отказ", desc: "Масло → вода → земля → стоп", duration: 90 },
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

  const handleScenario = async (id: string, duration: number) => {
    if (!running) await handleStart();
    setActiveScenario(id);
    await runScenario(locoId, id, duration);
    addLog(`Сценарий: ${id} (${duration} сек)`);
    setTimeout(() => setActiveScenario(null), duration * 1000);
  };

  return (
    <div className="page simulator-page">
      <header className="page-header">
        <h2>Simulator Control Panel</h2>
        <span className={`status-badge ${running ? "online" : "offline"}`}>
          {running ? `● Sending ${hz} Hz` : "○ Stopped"}
        </span>
      </header>

      <div className="sim-grid">
        <div className="widget">
          <h3>Локомотив</h3>
          <div className="sim-form">
            <label>
              ID
              <input type="text" value={locoId} onChange={(e) => setLocoId(e.target.value)} />
            </label>
            <label>
              Частота (Гц)
              <select value={hz} onChange={(e) => setHz(Number(e.target.value))}>
                <option value={1}>1 Hz</option>
                <option value={2}>2 Hz</option>
                <option value={5}>5 Hz</option>
                <option value={10}>10 Hz</option>
              </select>
            </label>
            <div className="sim-actions">
              <button className="btn-start" onClick={handleStart} disabled={running}>Запустить</button>
              <button className="btn-stop" onClick={handleStop} disabled={!running}>Остановить</button>
            </div>
          </div>
        </div>

        <div className="widget">
          <h3>Готовые сценарии</h3>
          <div className="scenario-list">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                className={`scenario-btn ${activeScenario === s.id ? "active" : ""}`}
                onClick={() => handleScenario(s.id, s.duration)}
              >
                <span className="scenario-name">{s.name}</span>
                <span className="scenario-desc">{s.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="widget">
          <h3>Highload-тест</h3>
          <div className="sim-form">
            <label>
              Локомотивов
              <div className="highload-btns">
                {[1, 10, 50, 100, 500, 1700].map((n) => (
                  <button
                    key={n}
                    className={`hl-btn ${count === n ? "active" : ""}`}
                    onClick={() => setCount(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </label>
            <div className="sim-actions">
              <button className="btn-start" onClick={async () => {
                const res = await startSimulator(locoId, hz, count);
                setRunning(true);
                addLog(`Highload: ${count} лок × ${hz} Hz = ${count * hz} RPS`);
              }}>
                Запустить {count} × {hz} Hz = {count * hz} RPS
              </button>
              <button className="btn-stop" onClick={handleStop}>Стоп</button>
            </div>
          </div>
        </div>

        <div className="widget">
          <h3>Лог</h3>
          <div className="sim-log">
            {log.length === 0 ? (
              <span className="log-empty">Нет событий</span>
            ) : (
              log.map((entry, i) => <div key={i} className="log-entry">{entry}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
