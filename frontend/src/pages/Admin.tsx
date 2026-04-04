import { useEffect, useState } from "react";
import { fetchThresholds, fetchWeights } from "../services/api";

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
  const [tab, setTab] = useState<"thresholds" | "weights" | "system">("thresholds");
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [weights, setWeights] = useState<Weight[]>([]);

  useEffect(() => {
    fetchThresholds().then((r) => setThresholds(r.thresholds || [])).catch(() => {});
    fetchWeights().then((r) => setWeights(r.weights || [])).catch(() => {});
  }, []);

  const totalWeight = weights.reduce((s, w) => s + w.weight, 0);

  return (
    <div className="page admin-page">
      <header className="page-header">
        <h2>Администрирование</h2>
      </header>

      <div className="admin-layout">
        <nav className="admin-nav">
          <button className={tab === "thresholds" ? "active" : ""} onClick={() => setTab("thresholds")}>Пороги</button>
          <button className={tab === "weights" ? "active" : ""} onClick={() => setTab("weights")}>Веса HI</button>
          <button className={tab === "system" ? "active" : ""} onClick={() => setTab("system")}>Система</button>
          <a href="http://localhost:8000/docs" target="_blank" rel="noopener" className="admin-nav-link">API Docs ↗</a>
        </nav>

        <div className="admin-content">
          {tab === "thresholds" && (
            <div className="admin-table-wrap">
              <h3>Настройка порогов</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Параметр</th>
                    <th>Ед.</th>
                    <th>Crit ↓</th>
                    <th>Warn ↓</th>
                    <th>Norm ↓</th>
                    <th>Norm ↑</th>
                    <th>Warn ↑</th>
                    <th>Crit ↑</th>
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
            </div>
          )}

          {tab === "weights" && (
            <div className="admin-table-wrap">
              <h3>Веса индекса здоровья</h3>
              <p className="weight-sum" style={{ color: Math.abs(totalWeight - 1) > 0.05 ? "var(--yellow)" : "var(--green)" }}>
                Сумма весов: {totalWeight.toFixed(2)} / 1.00
              </p>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Параметр</th>
                    <th>Вес</th>
                    <th>Визуализация</th>
                  </tr>
                </thead>
                <tbody>
                  {weights.map((w) => (
                    <tr key={w.param_id}>
                      <td className="param-name">{w.param_id}</td>
                      <td>{w.weight.toFixed(2)}</td>
                      <td>
                        <div className="weight-bar">
                          <div className="weight-bar-fill" style={{ width: `${w.weight * 500}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "system" && (
            <div className="system-status">
              <h3>Состояние системы</h3>
              <div className="system-cards">
                <div className="sys-card">
                  <span className="sys-label">Backend</span>
                  <span className="sys-value online">● Online</span>
                </div>
                <div className="sys-card">
                  <span className="sys-label">PostgreSQL</span>
                  <span className="sys-value online">● Online</span>
                </div>
                <div className="sys-card">
                  <span className="sys-label">Redis</span>
                  <span className="sys-value online">● Online</span>
                </div>
                <div className="sys-card">
                  <span className="sys-label">Kafka</span>
                  <span className="sys-value online">● Online</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
