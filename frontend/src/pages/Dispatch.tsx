import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket";
import { useFleetStore } from "../stores/fleetStore";
import { getWsUrl, fetchLocomotives } from "../services/api";
import FleetMap from "../components/FleetMap";

export default function Dispatch() {
  const navigate = useNavigate();
  const { locomotives, stats, updateFromWs, setFleet } = useFleetStore();
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    fetchLocomotives().then((res) => {
      if (res.locomotives) setFleet(res.locomotives);
    }).catch(() => {});
  }, [setFleet]);

  const onMessage = useCallback((msg: any) => {
    updateFromWs(msg);
  }, [updateFromWs]);

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
    <div className="page dispatch-page">
      <header className="page-header">
        <h2>Центр управления</h2>
        <div className="fleet-stats">
          <span className="stat">Всего: <b>{stats.total}</b></span>
          <span className="stat stat-normal">● {stats.normal}</span>
          <span className="stat stat-attention">● {stats.attention}</span>
          <span className="stat stat-critical">● {stats.critical}</span>
        </div>
      </header>

      <div className="dispatch-layout">
        <div className="dispatch-sidebar">
          <div className="dispatch-controls">
            <input
              type="text"
              placeholder="Поиск по номеру..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dispatch-search"
            />
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="dispatch-filter">
              <option value="all">Все</option>
              <option value="critical">Критично</option>
              <option value="attention">Внимание</option>
              <option value="normal">Норма</option>
            </select>
          </div>

          <div className="loco-list">
            {locoList.map((loco) => (
              <div
                key={loco.locomotive_id}
                className={`loco-card ${loco.hi_category} ${selectedId === loco.locomotive_id ? "selected" : ""}`}
                onClick={() => setSelectedId(loco.locomotive_id)}
                onDoubleClick={() => navigate(`/dispatch/loco/${loco.locomotive_id}`)}
              >
                <div className="loco-card-header">
                  <span className={`loco-status-dot ${loco.hi_category}`} />
                  <span className="loco-id">{loco.locomotive_id}</span>
                  <span className="loco-hi">HI: {loco.health_index ?? "—"}</span>
                </div>
                <div className="loco-card-details">
                  <span>{loco.speed_kmh?.toFixed(0) ?? "—"} км/ч</span>
                  {loco.alert_count > 0 && (
                    <span className="loco-alert-badge">Алерт: {loco.alert_count}</span>
                  )}
                </div>
              </div>
            ))}
            {locoList.length === 0 && (
              <div className="loco-list-empty">Нет локомотивов. Запустите симулятор.</div>
            )}
          </div>
        </div>

        <div className="dispatch-map">
          <FleetMap locomotives={mapLocos} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>
    </div>
  );
}
