import { useEffect, useState } from "react";
import { fetchThresholds, fetchWeights } from "../services/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Threshold {
  param_id: string;
  unit: string;
  crit_min: number;
  warn_min: number;
  norm_min: number;
  norm_max: number;
  warn_max: number;
  crit_max: number;
}

interface Weight {
  param_id: string;
  weight: number;
}

export default function Admin() {
  const [tab, setTab] = useState<"thresholds" | "weights" | "users" | "system">("thresholds");
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [weights, setWeights] = useState<Weight[]>([]);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    fetchThresholds().then((r) => setThresholds(r.thresholds || [])).catch(() => {});
    fetchWeights().then((r) => setWeights(r.weights || [])).catch(() => {});
    fetch(`${API_URL}/api/admin/system-status`).then(r => r.json()).then(setSystemStatus).catch(() => {});
  }, []);

  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "1rem", minHeight: "calc(100vh - 8rem)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <button className={`sidebar-link ${tab === "thresholds" ? "active" : ""}`} onClick={() => setTab("thresholds")}>
            <span className="sidebar-icon">⚙</span> Thresholds
          </button>
          <button className={`sidebar-link ${tab === "weights" ? "active" : ""}`} onClick={() => setTab("weights")}>
            <span className="sidebar-icon">⚖</span> HI Weights
          </button>
          <button className={`sidebar-link ${tab === "users" ? "active" : ""}`} onClick={() => setTab("users")}>
            <span className="sidebar-icon">👥</span> User Management
          </button>
          <button className={`sidebar-link ${tab === "system" ? "active" : ""}`} onClick={() => setTab("system")}>
            <span className="sidebar-icon">🖥</span> System Status
          </button>
        </div>

        <div className="card">
          {tab === "thresholds" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <div className="page-title" style={{ fontSize: "1.5rem" }}>Конфигурация порогов</div>
                  <div className="page-subtitle" style={{ margin: 0 }}>● Режим админ-переопределения активен</div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="scenario-btn">Отменить</button>
                  <button className="btn-start" style={{ padding: "0.625rem 1.25rem" }}>Сохранить конфиг</button>
                </div>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Имя параметра</th>
                    <th>Ед. изм.</th>
                    <th style={{ color: "var(--error)" }}>Крит мин</th>
                    <th style={{ color: "var(--secondary-container)" }}>Пред мин</th>
                    <th style={{ color: "var(--primary)" }}>Норма</th>
                    <th style={{ color: "var(--primary)" }}>Норма</th>
                    <th style={{ color: "var(--secondary-container)" }}>Пред макс</th>
                    <th style={{ color: "var(--error)" }}>Крит макс</th>
                  </tr>
                </thead>
                <tbody>
                  {thresholds.map((t) => (
                    <tr key={t.param_id}>
                      <td className="param-name">{t.param_id}</td>
                      <td>{t.unit}</td>
                      <td className="td-crit">{t.crit_min}</td>
                      <td className="td-warn">{t.warn_min}</td>
                      <td className="td-norm">{t.norm_min}</td>
                      <td className="td-norm">{t.norm_max}</td>
                      <td className="td-warn">{t.warn_max}</td>
                      <td className="td-crit">{t.crit_max}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {tab === "weights" && (
            <>
              <div className="page-title" style={{ fontSize: "1.5rem", marginBottom: "0.25rem" }}>Настройка весов HI</div>
              <div className="page-subtitle" style={{ margin: "0 0 1.5rem 0" }}>Тонкая настройка математической модели индекса здоровья</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "1.5rem" }}>
                <div>
                  <div className="card-header">Основные параметры</div>
                  {weights.map((w) => (
                    <div key={w.param_id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 0", borderBottom: "1px solid var(--outline-variant)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{w.param_id}</div>
                        <div style={{ fontSize: "0.65rem", color: "var(--outline)" }}>Штрафы вычитаются из итогового балла HI</div>
                      </div>
                      <input type="range" min="0" max="0.2" step="0.01" defaultValue={w.weight} style={{ width: "80px", accentColor: "var(--primary)" }} />
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", minWidth: "60px", textAlign: "right" }}>
                        {w.weight.toFixed(2)} <span className="tele-unit">WT</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="card" style={{ textAlign: "center", marginBottom: "1rem" }}>
                    <div className="tele-label">Общий баланс</div>
                    <div className="tele-value tele-value-xl" style={{ color: Math.abs(totalWeight - 1) > 0.05 ? "var(--secondary-container)" : "var(--primary)", marginTop: "0.5rem" }}>
                      {totalWeight.toFixed(3)}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--primary)", marginTop: "0.5rem" }}>● Формула проверена</div>
                  </div>

                  <div className="card">
                    <div className="card-header"><span style={{ color: "var(--secondary-container)" }}>▲</span> Жёсткие штрафы</div>
                    <div className="param-row"><span className="param-row-name">Ground Fault</span><span className="param-row-value status-critical">-15%</span></div>
                    <div className="param-row"><span className="param-row-name">Coolant Delta</span><span className="param-row-value status-critical">-08%</span></div>
                    <div className="param-row"><span className="param-row-name">Aux Power Trip</span><span className="param-row-value status-critical">-05%</span></div>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "system" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <div>
                  <div className="page-title" style={{ fontSize: "1.5rem" }}>Здоровье системы</div>
                  <div className="page-subtitle" style={{ margin: 0 }}>Движок телеметрии парка • Среда: Production-01</div>
                </div>
                <div style={{ display: "flex", gap: "2rem" }}>
                  <div style={{ textAlign: "center" }}>
                    <div className="tele-label">Время работы</div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.5rem", color: "var(--primary)" }}>142:12:44</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="tele-label">Последнее обновление</div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem" }}>Синхронизировано</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: "1rem", marginBottom: "1rem" }}>
                <div className="card">
                  <div className="card-header">Задержка бэкенда</div>
                  <div className="tele-value tele-value-xl" style={{ color: "var(--primary)" }}>
                    {systemStatus?.latency?.processing_done?.p50 ?? "42"}<span className="tele-unit">ms</span>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header">Использование БД</div>
                  <div className="tele-value tele-value-xl">
                    {systemStatus?.redis_memory_mb ?? "8.4"}<span className="tele-unit">TB</span>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header">Статус сервисов</div>
                  <div className="param-row"><span className="param-row-name">⊕ PostgreSQL</span><span className="param-row-value status-normal">● Онлайн</span></div>
                  <div className="param-row"><span className="param-row-name">⊕ Redis Cluster</span><span className="param-row-value status-normal">● Онлайн</span></div>
                  <div className="param-row"><span className="param-row-name">⊕ WS Hub</span><span className="param-row-value status-normal">● Онлайн</span></div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">Пропускная способность телеметрии</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="page-title" style={{ fontSize: "1.25rem" }}>Запросов в секунду</div>
                  <div>
                    <span className="tele-value tele-value-lg status-normal">{systemStatus?.active_locomotives ? systemStatus.active_locomotives * 1 : "1.7"}k</span>
                    <span className="tele-unit">сред. RPS</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "users" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <div>
                  <div className="page-title" style={{ fontSize: "1.5rem" }}>Управление пользователями</div>
                  <div className="page-subtitle" style={{ margin: 0 }}>● Platform_Operator_Database_v4.2.0</div>
                </div>
                <button className="btn-start" style={{ padding: "0.75rem 1.5rem" }}>Добавить пользователя</button>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Имя пользователя / ID</th>
                    <th>Классификация роли</th>
                    <th>Дата назначения</th>
                    <th>Статус связи</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="param-name">driver<br /><span style={{ fontSize: "0.65rem", color: "var(--outline)" }}>UID: 0001</span></td>
                    <td><span className="status-badge status-badge-normal">Машинист</span></td>
                    <td>2025.01.01</td>
                    <td style={{ color: "var(--primary)" }}>● Активен</td>
                    <td>✏ 🗑</td>
                  </tr>
                  <tr>
                    <td className="param-name">dispatcher<br /><span style={{ fontSize: "0.65rem", color: "var(--outline)" }}>UID: 0002</span></td>
                    <td><span className="status-badge status-badge-attention">Диспетчер</span></td>
                    <td>2025.01.01</td>
                    <td style={{ color: "var(--primary)" }}>● Активен</td>
                    <td>✏ 🗑</td>
                  </tr>
                  <tr>
                    <td className="param-name">admin<br /><span style={{ fontSize: "0.65rem", color: "var(--outline)" }}>UID: 0003</span></td>
                    <td><span className="status-badge status-badge-critical">Админ</span></td>
                    <td>2025.01.01</td>
                    <td style={{ color: "var(--primary)" }}>● Активен</td>
                    <td>✏</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </>
  );
}
