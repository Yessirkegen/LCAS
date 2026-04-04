import { useCallback, useEffect, useMemo } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useLCAS } from "../hooks/useLCAS";
import { useFavicon } from "../hooks/useFavicon";
import { useHotkeys } from "../hooks/useHotkeys";
import { useTelemetryStore } from "../stores/telemetryStore";
import { getWsUrl } from "../services/api";
import HealthGauge from "../components/HealthGauge";
import ParamCard from "../components/ParamCard";
import TrendChart from "../components/TrendChart";
import AlertList from "../components/AlertList";
import MasterAlerts from "../components/MasterAlerts";
import CriticalOverlay from "../components/CriticalOverlay";

const LOCO_ID = "TE33A-0142";

function getParamStatus(value: number | undefined | null, warnLow: number, normLow: number, normHigh: number, warnHigh: number): "normal" | "warning" | "critical" {
  if (value === null || value === undefined) return "normal";
  if (value >= normLow && value <= normHigh) return "normal";
  if (value >= warnLow && value <= warnHigh) return "warning";
  return "critical";
}

export default function Cabin() {
  const { data, healthIndex, alerts, history, update } = useTelemetryStore();
  const lcas = useLCAS();

  const onMessage = useCallback((msg: any) => {
    if (msg.type === "telemetry" && msg.locomotive_id === LOCO_ID) {
      update(msg);
    }
  }, [update]);

  const { status } = useWebSocket({
    url: getWsUrl(LOCO_ID),
    onMessage,
  });

  useEffect(() => {
    lcas.processAlerts(alerts);
  }, [alerts]);

  useFavicon(healthIndex?.value ?? null, healthIndex?.category ?? "normal", LOCO_ID);

  const hotkeys = useMemo(() => ({
    " ": () => lcas.acknowledgeWarning(),
    "d": () => document.documentElement.classList.toggle("light-theme"),
    "m": () => lcas.toggleSound(),
  }), [lcas]);
  useHotkeys(hotkeys);

  const hi = healthIndex;
  const d = data;

  return (
    <div className="page cabin-page">
      <header className="page-header">
        <h2>Кабина — {LOCO_ID}</h2>
        <span className={`status-badge ${status === "online" ? "online" : "offline"}`}>
          {status === "online" ? "● Online" : status === "reconnecting" ? "◌ Переподключение..." : "○ Offline"}
        </span>
      </header>

      <MasterAlerts
        masterWarning={lcas.masterWarning}
        masterCaution={lcas.masterCaution}
        soundEnabled={lcas.soundEnabled}
        onAckWarning={lcas.acknowledgeWarning}
        onAckCaution={lcas.acknowledgeCaution}
        onToggleSound={lcas.toggleSound}
      />

      <CriticalOverlay alerts={alerts} onAcknowledge={lcas.acknowledgeWarning} />

      {status === "reconnecting" && (
        <div className="connection-banner">Соединение потеряно. Переподключение...</div>
      )}

      <main className="cabin-grid">
        <div className="widget hi-widget">
          <h3>Индекс здоровья</h3>
          {hi ? (
            <HealthGauge
              value={hi.value}
              letter={hi.letter}
              category={hi.category}
              topFactors={hi.top_factors}
              predictedMinutes={hi.predicted_minutes_to_critical}
            />
          ) : (
            <div className="hi-value">—</div>
          )}
        </div>

        <div className="widget speed-widget">
          <h3>Скорость</h3>
          <div className="speed-value">{d?.speed_kmh?.toFixed(0) ?? "—"}<span className="speed-unit"> км/ч</span></div>
          {d?.wheel_slip && <div className="wheel-slip-indicator">БОКСОВАНИЕ</div>}
        </div>

        <div className="widget alerts-widget">
          <h3>Алерты</h3>
          <AlertList alerts={alerts} />
        </div>

        <div className="widget params-widget">
          <h3>Температуры</h3>
          <div className="params-grid">
            <ParamCard label="Вода вх" value={d?.water_temp_inlet} unit="°C" status={getParamStatus(d?.water_temp_inlet, 60, 71, 91, 100)} />
            <ParamCard label="Вода вых" value={d?.water_temp_outlet} unit="°C" status={getParamStatus(d?.water_temp_outlet, 60, 71, 91, 100)} />
            <ParamCard label="Масло вх" value={d?.oil_temp_inlet} unit="°C" status={getParamStatus(d?.oil_temp_inlet, 60, 72, 85, 90)} />
            <ParamCard label="Масло вых" value={d?.oil_temp_outlet} unit="°C" status={getParamStatus(d?.oil_temp_outlet, 60, 72, 85, 90)} />
            <ParamCard label="Возд колл" value={d?.air_temp_collector} unit="°C" precision={0} />
            <ParamCard label="Топливо" value={d?.fuel_temp} unit="°C" />
          </div>
        </div>

        <div className="widget params-widget">
          <h3>Давления</h3>
          <div className="params-grid">
            <ParamCard label="Вода" value={d?.water_pressure_kpa} unit="кПа" precision={0} status={getParamStatus(d?.water_pressure_kpa, 15, 28, 365, 400)} />
            <ParamCard label="Масло" value={d?.oil_pressure_kpa} unit="кПа" precision={0} status={getParamStatus(d?.oil_pressure_kpa, 100, 179, 765, 800)} />
            <ParamCard label="Воздух" value={d?.air_pressure_kpa} unit="кПа" precision={0} />
            <ParamCard label="Расход" value={d?.air_consumption} unit="" precision={0} />
            <ParamCard label="ГР" value={d?.main_reservoir_pressure} unit="кгс" precision={2} status={getParamStatus(d?.main_reservoir_pressure, 7.0, 7.5, 9.5, 10.0)} />
            <ParamCard label="ТМ" value={d?.brake_line_pressure} unit="кгс" precision={2} />
          </div>
        </div>

        <div className="widget params-widget">
          <h3>Электрика</h3>
          <div className="params-grid">
            <ParamCard label="Тяга" value={d?.traction_current} unit="А" precision={0} status={getParamStatus(d?.traction_current, 0, 0, 800, 900)} />
            <ParamCard label="Усилие" value={d?.traction_effort} unit="кН" precision={0} />
            <ParamCard label="Ген В" value={d?.generator_voltage} unit="В" precision={0} />
            <ParamCard label="Ген А" value={d?.generator_current} unit="А" precision={0} />
            <ParamCard label="Зазем сил" value={d?.ground_fault_power} status={d?.ground_fault_power ? "critical" : "normal"} />
            <ParamCard label="Зазем всп" value={d?.ground_fault_aux} status={d?.ground_fault_aux ? "critical" : "normal"} />
          </div>
        </div>

        <div className="widget params-widget">
          <h3>Топливо</h3>
          <div className="params-grid">
            <ParamCard label="Уровень" value={d?.fuel_level} unit="%" status={getParamStatus(d?.fuel_level, 5, 10, 100, 101)} />
            <ParamCard label="Расход" value={d?.fuel_consumption} unit="л/ч" precision={0} />
          </div>
        </div>

        <div className="widget chart-widget" style={{ gridColumn: "1 / -1" }}>
          <h3>Тренды</h3>
          <TrendChart
            history={history}
            fields={[
              { key: "health_index", name: "Health Index", color: "#22c55e" },
              { key: "water_temp_outlet", name: "Темп воды (вых)", color: "#3b82f6" },
              { key: "oil_temp_outlet", name: "Темп масла (вых)", color: "#f59e0b" },
            ]}
            height={280}
          />
        </div>
      </main>
    </div>
  );
}
