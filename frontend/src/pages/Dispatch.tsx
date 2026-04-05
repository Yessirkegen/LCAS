import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useWebSocket } from "../hooks/useWebSocket";
import { useFleetStore } from "../stores/fleetStore";
import { getWsUrl, fetchLocomotives } from "../services/api";
import FleetMap from "../components/FleetMap";
import HeatmapFleet from "../components/HeatmapFleet";
import SparkTimeline from "../components/SparkTimeline";

export default function Dispatch() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { locomotives, stats, updateFromWs, setFleet } = useFleetStore();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [viewMode, setViewMode] = useState<"list" | "heatmap" | "spark">("list");

  useEffect(() => {
    fetchLocomotives().then((res) => {
      if (res.locomotives) setFleet(res.locomotives);
    }).catch(() => {});
  }, [setFleet]);

  const onMessage = useCallback((msg: any) => { updateFromWs(msg); }, [updateFromWs]);
  useWebSocket({ url: getWsUrl(), onMessage });

  const locoList = Array.from(locomotives.values())
    .filter((l) => {
      if (filter !== "all" && l.hi_category !== filter) return false;
      if (search && !l.locomotive_id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => (a.health_index ?? 100) - (b.health_index ?? 100));

  const mapLocos = Array.from(locomotives.values());

  return (
    <>
      {/* Fleet Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="tele-label">Ёмкость флота</div>
          <div className="tele-value tele-value-xl" style={{ marginTop: "0.5rem" }}>1700</div>
          <div className="tele-unit">Units</div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="tele-label">В работе</div>
          <div className="tele-value tele-value-xl status-normal" style={{ marginTop: "0.5rem" }}>{stats.normal}<span style={{ fontSize: "0.8rem" }}>.</span></div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="tele-label">Обслуживание</div>
          <div className="tele-value tele-value-xl status-attention" style={{ marginTop: "0.5rem" }}>{stats.attention}<span style={{ fontSize: "0.8rem" }}>▲</span></div>
        </div>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="tele-label">Критично / Выведен</div>
          <div className="tele-value tele-value-xl status-critical" style={{ marginTop: "0.5rem" }}>{stats.critical}<span style={{ fontSize: "0.8rem" }}>○</span></div>
        </div>
      </div>

      {/* Main Content: List + Map */}
      <div className="dispatch-layout">
        <div className="dispatch-sidebar">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Реестр флота в реальном времени
            </span>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} className="dispatch-filter" style={{ width: "auto" }}>
              <option value="list">Список</option>
              <option value="heatmap">Heatmap</option>
              <option value="spark">Timeline</option>
            </select>
          </div>

          <div className="dispatch-controls">
            <input
              type="text"
              placeholder="Search parameters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dispatch-search"
            />
          </div>

          {viewMode === "list" && (
            <div className="loco-list">
              {locoList.map((loco) => (
                <div
                  key={loco.locomotive_id}
                  className={`loco-card ${loco.hi_category} ${selectedId === loco.locomotive_id ? "selected" : ""}`}
                  onClick={() => setSelectedId(loco.locomotive_id)}
                  onDoubleClick={() => navigate(`/dispatch/loco/${loco.locomotive_id}`)}
                >
                  <div className="loco-card-header">
                    <div>
                      <span className={`status-badge status-badge-${loco.hi_category}`}>
                        {loco.hi_category === "normal" ? "Нормальное состояние" : loco.hi_category === "attention" ? "Внимание" : "Срочное внимание"}
                      </span>
                      <div className="loco-id" style={{ marginTop: "0.375rem" }}>{loco.locomotive_id}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="loco-hi" style={{ color: loco.hi_category === "normal" ? "var(--primary)" : loco.hi_category === "attention" ? "var(--secondary-container)" : "var(--error)" }}>
                        {loco.health_index ?? "—"}
                      </div>
                      <div className="tele-label">Индекс здоровья</div>
                    </div>
                  </div>
                  <div className="loco-card-details" style={{ marginTop: "0.5rem" }}>
                    <span>⟐ {loco.speed_kmh?.toFixed(0) ?? "—"} km/h</span>
                    {loco.alert_count > 0 && (
                      <span className="loco-alert-badge">● {loco.alert_count} Активных Алерта</span>
                    )}
                  </div>
                </div>
              ))}
              {locoList.length === 0 && (
                <div className="loco-list-empty">Нет локомотивов. Запустите симулятор.</div>
              )}
            </div>
          )}

          {viewMode === "heatmap" && (
            <div className="card" style={{ flex: 1 }}>
              <div className="card-header">Heatmap флота ({stats.total})</div>
              <HeatmapFleet locomotives={locoList} onSelect={setSelectedId} />
            </div>
          )}

          {viewMode === "spark" && (
            <div className="card" style={{ flex: 1, overflow: "auto" }}>
              <div className="card-header">Health Timeline</div>
              {locoList.map((l) => (
                <SparkTimeline key={l.locomotive_id} locomotiveId={l.locomotive_id} healthIndex={l.health_index} category={l.hi_category} />
              ))}
            </div>
          )}
        </div>

        <div className="dispatch-map">
          <FleetMap locomotives={mapLocos} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>

      {/* Alert Log Table */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="card-header"><span className="card-header-icon">📋</span> Журнал событий — общий поток <span style={{ marginLeft: "auto", color: "var(--primary)", fontSize: "0.6rem" }}>Real-time telemetry feed</span></div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Время</th>
              <th>ID тепловоза</th>
              <th>Параметр</th>
              <th>Значение</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {locoList.slice(0, 5).map((l) => (
              <tr key={l.locomotive_id}>
                <td style={{ fontFamily: "var(--font-display)" }}>{new Date().toLocaleTimeString("ru-RU")}</td>
                <td style={{ fontWeight: 600 }}>{l.locomotive_id}</td>
                <td>{l.hi_category === "critical" ? "Темп. Воды" : l.hi_category === "attention" ? "Давление Масла" : "Пульс Системы"}</td>
                <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: l.hi_category === "critical" ? "var(--error)" : l.hi_category === "attention" ? "var(--secondary-container)" : "var(--primary)" }}>
                  {l.hi_category === "critical" ? "116 °C" : l.hi_category === "attention" ? "165 kPa" : "Стабильно"}
                </td>
                <td>
                  <span className={`status-badge status-badge-${l.hi_category}`}>
                    {l.hi_category === "normal" ? "Норма" : l.hi_category === "attention" ? "Внимание" : "Критично"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
