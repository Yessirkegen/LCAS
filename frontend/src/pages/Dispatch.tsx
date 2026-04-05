import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../hooks/useWebSocket";
import { useFleetStore } from "../stores/fleetStore";
import type { LocoSummary } from "../stores/fleetStore";
import { getWsUrl, fetchLocomotives } from "../services/api";
import FleetMap from "../components/FleetMap";
import HeatmapFleet from "../components/HeatmapFleet";
import SparkTimeline from "../components/SparkTimeline";

const PAGE = 50;

const LocoCard = memo(function LocoCard({ loco, selected, onClick, onDblClick }: {
  loco: LocoSummary; selected: boolean; onClick: () => void; onDblClick: () => void;
}) {
  return (
    <div
      className={`loco-card ${loco.hi_category} ${selected ? "selected" : ""}`}
      onClick={onClick}
      onDoubleClick={onDblClick}
    >
      <div className="loco-card-header">
        <div>
          <span className={`status-badge status-badge-${loco.hi_category}`}>
            {loco.hi_category === "normal" ? "Норма" : loco.hi_category === "attention" ? "Внимание" : "Критично"}
          </span>
          <div className="loco-id" style={{ marginTop: "0.375rem" }}>{loco.locomotive_id}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="loco-hi" style={{ color: loco.hi_category === "normal" ? "var(--primary)" : loco.hi_category === "attention" ? "var(--secondary-container)" : "var(--error)" }}>
            {loco.health_index ?? "—"}
          </div>
          <div className="tele-label">HI</div>
        </div>
      </div>
      <div className="loco-card-details" style={{ marginTop: "0.5rem" }}>
        <span>⟐ {loco.speed_kmh?.toFixed(0) ?? "—"} km/h</span>
        {loco.alert_count > 0 && <span className="loco-alert-badge">● {loco.alert_count}</span>}
      </div>
    </div>
  );
});

function StatsRow() {
  const stats = useFleetStore((s) => s.stats);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="tele-label">Флот</div>
        <div className="tele-value tele-value-xl" style={{ marginTop: "0.5rem" }}>{stats.total}</div>
      </div>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="tele-label">В работе</div>
        <div className="tele-value tele-value-xl status-normal" style={{ marginTop: "0.5rem" }}>{stats.normal}</div>
      </div>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="tele-label">Внимание</div>
        <div className="tele-value tele-value-xl status-attention" style={{ marginTop: "0.5rem" }}>{stats.attention}</div>
      </div>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="tele-label">Критично</div>
        <div className="tele-value tele-value-xl status-critical" style={{ marginTop: "0.5rem" }}>{stats.critical}</div>
      </div>
    </div>
  );
}

export default function Dispatch() {
  const navigate = useNavigate();
  const updateFromWs = useFleetStore((s) => s.updateFromWs);
  const setFleet = useFleetStore((s) => s.setFleet);
  const locoMap = useFleetStore((s) => s.locoMap);
  const dataVersion = useFleetStore((s) => s.dataVersion);

  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [viewMode, setViewMode] = useState<"list" | "heatmap" | "spark">("list");
  const [listLimit, setListLimit] = useState(PAGE);

  useEffect(() => {
    fetchLocomotives().then((res) => {
      if (res.locomotives) setFleet(res.locomotives);
    }).catch(() => {});
  }, [setFleet]);

  const onMessage = useCallback((msg: any) => { updateFromWs(msg); }, [updateFromWs]);
  useWebSocket({ url: getWsUrl(), onMessage });

  const locoList = useMemo(() => {
    const vals = Object.values(locoMap);
    let arr = vals;
    if (filter !== "all") arr = arr.filter((l) => l.hi_category === filter);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((l) => l.locomotive_id.toLowerCase().includes(q));
    }
    arr.sort((a, b) => (a.health_index ?? 100) - (b.health_index ?? 100));
    return arr;
  }, [locoMap, filter, search, dataVersion]);

  return (
    <>
      <StatsRow />

      <div className="dispatch-layout">
        <div className="dispatch-sidebar">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Реестр ({locoList.length})
            </span>
            <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} className="dispatch-filter" style={{ width: "auto" }}>
              <option value="list">Список</option>
              <option value="heatmap">Heatmap</option>
              <option value="spark">Timeline</option>
            </select>
          </div>

          <div className="dispatch-controls">
            <input type="text" placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="dispatch-search" />
          </div>

          {viewMode === "list" && (
            <div className="loco-list">
              {locoList.slice(0, listLimit).map((loco) => (
                <LocoCard
                  key={loco.locomotive_id}
                  loco={loco}
                  selected={selectedId === loco.locomotive_id}
                  onClick={() => setSelectedId(loco.locomotive_id)}
                  onDblClick={() => navigate(`/dispatch/loco/${loco.locomotive_id}`)}
                />
              ))}
              {listLimit < locoList.length && (
                <button className="scenario-btn" style={{ width: "100%", marginTop: "0.5rem", padding: "0.5rem" }} onClick={() => setListLimit((l) => l + PAGE)}>
                  Ещё {Math.min(PAGE, locoList.length - listLimit)} из {locoList.length - listLimit}
                </button>
              )}
              {locoList.length === 0 && <div className="loco-list-empty">Нет локомотивов</div>}
            </div>
          )}

          {viewMode === "heatmap" && (
            <div className="card" style={{ flex: 1 }}>
              <div className="card-header">Heatmap ({locoList.length})</div>
              <HeatmapFleet locomotives={locoList} onSelect={setSelectedId} />
            </div>
          )}

          {viewMode === "spark" && (
            <div className="card" style={{ flex: 1, overflow: "auto" }}>
              <div className="card-header">Таймлайн (топ-50)</div>
              {locoList.slice(0, 50).map((l) => (
                <SparkTimeline key={l.locomotive_id} locomotiveId={l.locomotive_id} healthIndex={l.health_index} category={l.hi_category} />
              ))}
            </div>
          )}
        </div>

        <div className="dispatch-map">
          <FleetMap selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <div className="card-header"><span className="card-header-icon">📋</span> Критичные события</div>
        <table className="admin-table">
          <thead>
            <tr><th>ID</th><th>HI</th><th>Скорость</th><th>Статус</th></tr>
          </thead>
          <tbody>
            {locoList.slice(0, 8).map((l) => (
              <tr key={l.locomotive_id}>
                <td style={{ fontWeight: 600 }}>{l.locomotive_id}</td>
                <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: l.hi_category === "critical" ? "var(--error)" : l.hi_category === "attention" ? "var(--secondary-container)" : "var(--primary)" }}>
                  {l.health_index ?? "—"}
                </td>
                <td>{l.speed_kmh?.toFixed(0) ?? "—"} km/h</td>
                <td><span className={`status-badge status-badge-${l.hi_category}`}>{l.hi_category === "normal" ? "Норма" : l.hi_category === "attention" ? "Внимание" : "Критично"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
