import { useCallback, useEffect, useMemo, useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { useLCAS } from "../hooks/useLCAS";
import { useFavicon } from "../hooks/useFavicon";
import { useHotkeys } from "../hooks/useHotkeys";
import { useTelemetryStore } from "../stores/telemetryStore";
import { getWsUrl } from "../services/api";
import HealthGauge from "../components/HealthGauge";
import TrendChart from "../components/TrendChart";
import AlertList from "../components/AlertList";
import MasterAlerts from "../components/MasterAlerts";
import CriticalOverlay from "../components/CriticalOverlay";
import ConsistView from "../components/ConsistView";
import ScheduleView from "../components/ScheduleView";
import IncidentTimeline from "../components/IncidentTimeline";
import OnboardingTour from "../components/OnboardingTour";
import Locomotive3D from "../components/Locomotive3D";
import LocomotiveKZ8A from "../components/LocomotiveKZ8A";
import DashboardCustomizer, { useDashboardPanels } from "../components/DashboardCustomizer";
import CorrelationMatrix from "../components/CorrelationMatrix";
import LocoPicker from "../components/LocoPicker";

const TREND_PRESETS_TE33A: Record<string, Array<{ key: string; name: string; color: string }>> = {
  "Обзор": [
    { key: "health_index", name: "Индекс здоровья", color: "#75ff9e" },
    { key: "speed_kmh", name: "Скорость", color: "#64b5f6" },
    { key: "traction_current", name: "Тяга", color: "#fdd400" },
  ],
  "Температуры": [
    { key: "water_temp_inlet", name: "Вода вх", color: "#42a5f5" },
    { key: "water_temp_outlet", name: "Вода вых", color: "#1e88e5" },
    { key: "oil_temp_inlet", name: "Масло вх", color: "#ffca28" },
    { key: "oil_temp_outlet", name: "Масло вых", color: "#ff8f00" },
  ],
  "Давления": [
    { key: "water_pressure_kpa", name: "Вода кПа", color: "#42a5f5" },
    { key: "oil_pressure_kpa", name: "Масло кПа", color: "#ffca28" },
    { key: "main_reservoir_pressure", name: "ГР", color: "#75ff9e" },
    { key: "brake_line_pressure", name: "ТМ", color: "#ef5350" },
  ],
  "Электрика": [
    { key: "traction_current", name: "Ток тяги", color: "#fdd400" },
    { key: "generator_voltage", name: "Напряж. ген.", color: "#64b5f6" },
    { key: "health_index", name: "Инд. здоровья", color: "#75ff9e" },
  ],
  "Топливо": [
    { key: "fuel_level", name: "Уровень %", color: "#75ff9e" },
    { key: "fuel_consumption", name: "Расход л/ч", color: "#ff8a65" },
    { key: "speed_kmh", name: "Скорость", color: "#64b5f6" },
  ],
};

const TREND_PRESETS_KZ8A: Record<string, Array<{ key: string; name: string; color: string }>> = {
  "Обзор": [
    { key: "health_index", name: "Индекс здоровья", color: "#75ff9e" },
    { key: "speed_kmh", name: "Скорость", color: "#64b5f6" },
    { key: "traction_current", name: "Ток ТЭД", color: "#fdd400" },
  ],
  "Электрика": [
    { key: "catenary_voltage", name: "Напряж. сети", color: "#ff8a65" },
    { key: "pantograph_current", name: "Ток пантографа", color: "#fdd400" },
    { key: "traction_current", name: "Ток ТЭД", color: "#64b5f6" },
  ],
  "Температуры": [
    { key: "ted_avg_temp", name: "ТЭД средн.", color: "#ff8a65" },
    { key: "ted_max_temp", name: "ТЭД макс.", color: "#ef5350" },
    { key: "inverter_temp", name: "Инвертор", color: "#fdd400" },
    { key: "cooling_water_temp", name: "Охлаждение", color: "#42a5f5" },
  ],
  "Пневматика": [
    { key: "main_reservoir_pressure", name: "ГР", color: "#75ff9e" },
    { key: "brake_line_pressure", name: "ТМ", color: "#ef5350" },
    { key: "speed_kmh", name: "Скорость", color: "#64b5f6" },
  ],
  "Рекуперация": [
    { key: "regen_power_kw", name: "Рекуп. кВт", color: "#75ff9e" },
    { key: "speed_kmh", name: "Скорость", color: "#64b5f6" },
    { key: "catenary_voltage", name: "Напряжение", color: "#ff8a65" },
  ],
  "Охлаждение": [
    { key: "ted_avg_temp", name: "ТЭД средн.", color: "#ff8a65" },
    { key: "cooling_water_temp", name: "Вода охл.", color: "#42a5f5" },
    { key: "inverter_temp", name: "Инвертор", color: "#fdd400" },
  ],
};

function TrendSection({ history, isKZ8A }: { history: any[]; isKZ8A: boolean }) {
  const presets = isKZ8A ? TREND_PRESETS_KZ8A : TREND_PRESETS_TE33A;
  const presetNames = Object.keys(presets);
  const [activePreset, setActivePreset] = useState(presetNames[0]);
  const fields = presets[activePreset] || presets[presetNames[0]];

  return (
    <div className="card chart-widget" style={{ marginBottom: "1rem" }}>
      <div className="card-header">
        <span className="card-header-icon">📈</span> Тренд телеметрии
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
          {presetNames.map((name) => (
            <button
              key={name}
              className="scenario-btn"
              style={{
                padding: "0.2rem 0.5rem",
                fontSize: "0.6rem",
                borderColor: activePreset === name ? "var(--primary)" : undefined,
                color: activePreset === name ? "var(--primary)" : undefined,
              }}
              onClick={() => setActivePreset(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <TrendChart history={history} fields={fields} height={280} />
    </div>
  );
}

export default function Cabin() {
  const [locoId, setLocoId] = useState<string | null>(null);

  if (!locoId) {
    return <LocoPicker onSelect={setLocoId} />;
  }

  return <CabinDashboard locoId={locoId} onBack={() => setLocoId(null)} />;
}

function CabinDashboard({ locoId, onBack }: { locoId: string; onBack: () => void }) {
  const isKZ8A = locoId.startsWith("KZ8A");
  const { data, healthIndex, alerts, history, update, acknowledgeAll, setInitial, clearHistory } = useTelemetryStore();
  const lcas = useLCAS();
  const { panels, toggle: togglePanel, isVisible } = useDashboardPanels();
  const [customizerOpen, setCustomizerOpen] = useState(false);

  useEffect(() => {
    clearHistory();
    const API = import.meta.env.VITE_API_URL || (window.location.hostname !== "localhost" ? `${window.location.protocol}//${window.location.host}` : "http://localhost:8000");
    fetch(`${API}/api/locomotives/${locoId}/state`)
      .then((r) => r.json())
      .then((res) => {
        if (res.state) setInitial(res.state, res.health_index, res.alerts || []);
      })
      .catch(() => {});
  }, [locoId]);

  const handleAcknowledge = useCallback(() => {
    lcas.acknowledgeWarning();
    acknowledgeAll();
  }, [lcas, acknowledgeAll]);

  const onMessage = useCallback((msg: any) => {
    if (msg.type === "telemetry" && msg.locomotive_id === locoId) {
      update(msg);
    }
  }, [update, locoId]);

  const { status } = useWebSocket({ url: getWsUrl(locoId), onMessage });

  useEffect(() => { lcas.processAlerts(alerts); }, [alerts]);
  useFavicon(healthIndex?.value ?? null, healthIndex?.category ?? "normal", locoId);

  const hotkeys = useMemo(() => ({
    " ": () => handleAcknowledge(),
    "d": () => document.documentElement.classList.toggle("light-theme"),
    "m": () => lcas.toggleSound(),
  }), [lcas]);
  useHotkeys(hotkeys);

  const hi = healthIndex;
  const d = data;

  return (
    <>
      <OnboardingTour onComplete={() => {}} />
      <DashboardCustomizer panels={panels} onToggle={togglePanel} open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
      <CriticalOverlay alerts={alerts} onAcknowledge={handleAcknowledge} />

      <div className="page-header" style={{ marginBottom: "1rem" }}>
        <div>
          <div className="page-title" style={{ fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span>Индекс здоровья (HI)</span>
            <span className={`status-badge status-badge-${hi?.category || "normal"}`}>
              {hi?.category === "normal" ? "NORMAL" : hi?.category === "attention" ? "ВНИМАНИЕ" : "КРИТИЧНО"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button className="scenario-btn" onClick={onBack} style={{ padding: "0.3rem 0.6rem", fontSize: "0.7rem" }}>← Сменить</button>
          <button className="scenario-btn" onClick={() => setCustomizerOpen(true)} style={{ padding: "0.3rem 0.5rem", fontSize: "0.9rem" }}>⚙</button>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "0.7rem", color: "var(--on-surface-variant)" }}>
            Кабина: {locoId}
          </span>
          <span className={`status-badge ${status === "online" ? "online" : "offline"}`} style={{ fontFamily: "var(--font-display)", fontSize: "0.65rem", letterSpacing: "0.05em" }}>
            {status === "online" ? "● ONLINE" : status === "reconnecting" ? "◌ RECONNECT..." : "○ OFFLINE"}
          </span>
        </div>
      </div>

      <MasterAlerts
        masterWarning={lcas.masterWarning}
        masterCaution={lcas.masterCaution}
        soundEnabled={lcas.soundEnabled}
        onAckWarning={handleAcknowledge}
        onAckCaution={lcas.acknowledgeCaution}
        onToggleSound={lcas.toggleSound}
      />

      {status === "reconnecting" && (
        <div className="connection-banner">[!] Соединение потеряно. Переподключение...</div>
      )}

      {/* Row 1: Speed | HI (center) | Master Alert */}
      <div style={{ display: "grid", gridTemplateColumns: "0.8fr 2.4fr 0.8fr", gap: "1rem", marginBottom: "1rem" }}>
        <div className="card" style={{ textAlign: "center" }}>
          <div className="card-header"><span className="card-header-icon">⟐</span> Текущая скорость</div>
          <div className="tele-value tele-value-xl" style={{ marginTop: "0.5rem" }}>
            {d?.speed_kmh?.toFixed(1) ?? "—"}
          </div>
          <div className="tele-unit">km/h</div>
          {d?.wheel_slip && <div className="wheel-slip-indicator" style={{ marginTop: "0.75rem" }}>Боксование</div>}
        </div>

        <div className="card" style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div className="card-header" style={{ alignSelf: "stretch" }}><span className="card-header-icon">◉</span> Индекс здоровья</div>
          {hi ? (
            <HealthGauge value={hi.value} letter={hi.letter} category={hi.category} topFactors={hi.top_factors} predictedMinutes={hi.predicted_minutes_to_critical} />
          ) : (
            <div className="tele-value tele-value-xl" style={{ textAlign: "center", padding: "2rem" }}>—</div>
          )}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-header-icon">⚠</span> Главный алерт</div>
          <AlertList alerts={alerts} />
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
            <button className="scenario-btn" style={{ flex: 1, background: d?.wheel_slip ? "var(--secondary-container)" : undefined, color: d?.wheel_slip ? "var(--on-primary)" : undefined }}>
              Боксование {d?.wheel_slip ? "🔴" : "OFF"}
            </button>
            <button className="scenario-btn" style={{ flex: 1 }}>Автопилот OFF</button>
          </div>
        </div>
      </div>

      {/* Row 2: Parameters — different for TE33A vs KZ8A */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        {isKZ8A ? (
          <>
            <div className="card">
              <div className="card-header"><span className="card-header-icon">⚡</span> Контактная сеть</div>
              <div className="param-row"><span className="param-row-name">Напряжение</span><span className="param-row-value">{d?.catenary_voltage?.toFixed(0) ?? "—"}<span className="tele-unit">В</span></span></div>
              <div className="param-row"><span className="param-row-name">Ток пантографа</span><span className="param-row-value">{d?.pantograph_current?.toFixed(0) ?? "—"}<span className="tele-unit">А</span></span></div>
              <div className="param-row"><span className="param-row-name">Пантограф</span><span className="param-row-value" style={{ color: d?.pantograph_up ? "var(--primary)" : "var(--error)" }}>{d?.pantograph_up ? "▲ ПОДНЯТ" : "▼ ОПУЩЕН"}</span></div>
              <div className="param-row"><span className="param-row-name">Рекуперация</span><span className="param-row-value" style={{ color: d?.regen_active ? "var(--primary)" : undefined }}>{d?.regen_active ? `${d?.regen_power_kw ?? 0} кВт` : "ВЫКЛ"}</span></div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-header-icon">🌡</span> Температуры</div>
              <div className="param-row"><span className="param-row-name">Масло трансф.</span><span className="param-row-value">{d?.oil_temp_inlet?.toFixed(0) ?? d?.transformer_oil_temp?.toFixed(0) ?? "—"}<span className="tele-unit">°C</span></span></div>
              <div className="param-row"><span className="param-row-name">Инвертор</span><span className="param-row-value">{d?.inverter_temp?.toFixed(0) ?? "—"}<span className="tele-unit">°C</span></span></div>
              <div className="param-row"><span className="param-row-name">ТЭД средн.</span><span className="param-row-value">{d?.ted_avg_temp?.toFixed(0) ?? "—"}<span className="tele-unit">°C</span></span></div>
              <div className="param-row"><span className="param-row-name">ТЭД макс.</span><span className="param-row-value" style={{ color: (d?.ted_max_temp ?? 0) > 140 ? "var(--error)" : undefined }}>{d?.ted_max_temp?.toFixed(0) ?? "—"}<span className="tele-unit">°C</span></span></div>
              <div className="param-row"><span className="param-row-name">Охлаждение</span><span className="param-row-value">{d?.cooling_water_temp?.toFixed(0) ?? "—"}<span className="tele-unit">°C</span></span></div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-header-icon">🔧</span> Тяга / Пневматика</div>
              <div className="param-row"><span className="param-row-name">Ток ТЭД</span><span className="param-row-value">{d?.traction_current?.toFixed(0) ?? d?.ted_avg_current?.toFixed(0) ?? "—"}<span className="tele-unit">А</span></span></div>
              <div className="param-row"><span className="param-row-name">Ток инвертора</span><span className="param-row-value">{d?.inverter_current?.toFixed(0) ?? "—"}<span className="tele-unit">А</span></span></div>
              <div className="param-row"><span className="param-row-name">ГР</span><span className="param-row-value">{d?.main_reservoir_pressure?.toFixed(1) ?? "—"}<span className="tele-unit">bar</span></span></div>
              <div className="param-row"><span className="param-row-name">ТМ</span><span className="param-row-value">{d?.brake_line_pressure?.toFixed(1) ?? "—"}<span className="tele-unit">bar</span></span></div>
              <div className="param-row"><span className="param-row-name">Заземление</span><span className="param-row-value" style={{ color: d?.ground_fault_power ? "var(--error)" : "var(--primary)" }}>{d?.ground_fault_power ? "FAULT" : "OK"}</span></div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-header-icon">🚃</span> Секция 2</div>
              <div className="param-row"><span className="param-row-name">Связь</span><span className="param-row-value" style={{ color: d?.section2_connected ? "var(--primary)" : "var(--error)" }}>{d?.section2_connected !== false ? "● ПОДКЛ" : "○ ОТКЛ"}</span></div>
              <div className="param-row"><span className="param-row-name">ТЭД секц.2</span><span className="param-row-value">{d?.section2_ted_temp?.toFixed(0) ?? "—"}<span className="tele-unit">°C</span></span></div>
              <div className="param-row"><span className="param-row-name">Вент. об/мин</span><span className="param-row-value">{d?.cooling_fan_rpm?.toFixed(0) ?? "—"}</span></div>
              <div className="tele-label" style={{ marginTop: "0.5rem" }}>Тип: Электровоз 25кВ</div>
              <div className="tele-label">Мощность: 8800 кВт</div>
            </div>
          </>
        ) : (
          <>
            <div className="card">
              <div className="card-header"><span className="card-header-icon">🌡</span> Температуры</div>
              <div className="param-row"><span className="param-row-name">Вода вх/вых</span><span className="param-row-value">{d?.water_temp_inlet?.toFixed(0) ?? "—"} / {d?.water_temp_outlet?.toFixed(0) ?? "—"}<span className="tele-unit">°C</span></span></div>
              <div className="param-row"><span className="param-row-name">Масло вх/вых</span><span className="param-row-value">{d?.oil_temp_inlet?.toFixed(0) ?? "—"} / {d?.oil_temp_outlet?.toFixed(0) ?? "—"}<span className="tele-unit">°C</span></span></div>
              <div className="param-row"><span className="param-row-name">Воздухосборник</span><span className="param-row-value">{d?.air_temp_collector?.toFixed(0) ?? "—"}<span className="tele-unit">Pa</span></span></div>
              <div className="param-row"><span className="param-row-name">Темп. топлива</span><span className="param-row-value">{d?.fuel_temp?.toFixed(0) ?? "—"}<span className="tele-unit">°C</span></span></div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-header-icon">⚙</span> Давления</div>
              <div className="param-row"><span className="param-row-name">Вода</span><span className="param-row-value">{d?.water_pressure_kpa?.toFixed(0) ?? "—"}<span className="tele-unit">кПа</span></span></div>
              <div className="param-row"><span className="param-row-name">Масло</span><span className="param-row-value">{d?.oil_pressure_kpa?.toFixed(0) ?? "—"}<span className="tele-unit">кПа</span></span></div>
              <div className="param-row"><span className="param-row-name">ГР</span><span className="param-row-value">{d?.main_reservoir_pressure?.toFixed(1) ?? "—"}<span className="tele-unit">bar</span></span></div>
              <div className="param-row"><span className="param-row-name">ТМ</span><span className="param-row-value">{d?.brake_line_pressure?.toFixed(1) ?? "—"}<span className="tele-unit">bar</span></span></div>
              <div className="param-row"><span className="param-row-name">Расход возд.</span><span className="param-row-value">{d?.air_consumption?.toFixed(0) ?? "—"}</span></div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-header-icon">⚡</span> Электрика</div>
              <div className="param-row"><span className="param-row-name">Ток тяги</span><span className="param-row-value" style={{ color: (d?.traction_current ?? 0) > 800 ? "var(--secondary-container)" : undefined }}>{d?.traction_current?.toFixed(0) ?? "—"}<span className="tele-unit">A</span></span></div>
              <div className="param-row"><span className="param-row-name">Генератор</span><span className="param-row-value">{d?.generator_voltage?.toFixed(0) ?? "—"}<span className="tele-unit">V</span> / {d?.generator_current?.toFixed(0) ?? "—"}<span className="tele-unit">A</span></span></div>
              <div className="param-row"><span className="param-row-name">GF 1</span><span className="param-row-value" style={{ color: d?.ground_fault_power ? "var(--error)" : "var(--primary)" }}>{d?.ground_fault_power ? "FAULT" : "OK"}</span></div>
              <div className="param-row"><span className="param-row-name">GF 2</span><span className="param-row-value" style={{ color: d?.ground_fault_aux ? "var(--error)" : "var(--primary)" }}>{d?.ground_fault_aux ? "FAULT" : "OK"}</span></div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-header-icon">⛽</span> Топливо</div>
              <div className="tele-label">Текущий уровень</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span className="tele-value tele-value-md" style={{ color: (d?.fuel_level ?? 100) < 20 ? "var(--secondary-container)" : undefined }}>{d?.fuel_level?.toFixed(0) ?? "—"}</span>
                <span className="tele-unit">%</span>
              </div>
              <div style={{ height: "6px", background: "var(--surface-container-highest)", borderRadius: "3px", overflow: "hidden", marginBottom: "1rem" }}>
                <div style={{ height: "100%", width: `${d?.fuel_level ?? 0}%`, background: (d?.fuel_level ?? 100) < 20 ? "var(--secondary-container)" : "var(--primary)", borderRadius: "3px", transition: "width 0.5s" }} />
              </div>
              <div className="tele-label">Расход</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                <span className="tele-value tele-value-md">{d?.fuel_consumption?.toFixed(0) ?? "—"}</span>
                <span className="tele-unit">L/h</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Row 3: Trends + Route Progress */}
      <TrendSection history={history} isKZ8A={isKZ8A} />

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div className="card">
          <div className="card-header"><span className="card-header-icon">📍</span> Прогресс маршрута</div>
          <ScheduleView locoId={locoId} />
        </div>
      </div>

      {/* Row 4: 3D Model + Correlation */}
      {(isVisible("loco3d") || isVisible("correlation")) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          {isVisible("loco3d") && (
            <div className="card">
              {isKZ8A ? (
                <>
                  <div className="card-header"><span className="card-header-icon">🚃</span> 3D-модель KZ8A</div>
                  <LocomotiveKZ8A
                    healthIndex={hi?.value ?? 100}
                    category={hi?.category ?? "normal"}
                    voltage={d?.catenary_voltage ?? null}
                    transformerTemp={d?.oil_temp_inlet ?? null}
                    tedTemp={d?.ted_avg_temp ?? d?.water_temp_outlet ?? null}
                    tractionCurrent={d?.traction_current ?? null}
                    groundFault={d?.ground_fault_power ?? false}
                    pantographUp={d?.pantograph_up ?? true}
                    regenPower={d?.regen_power_kw ?? null}
                  />
                </>
              ) : (
                <>
                  <div className="card-header"><span className="card-header-icon">🏗</span> 3D-модель ТЭ33А</div>
                  <Locomotive3D
                    healthIndex={hi?.value ?? 100}
                    category={hi?.category ?? "normal"}
                    waterTemp={d?.water_temp_outlet ?? null}
                    oilTemp={d?.oil_temp_outlet ?? null}
                    tractionCurrent={d?.traction_current ?? null}
                    groundFault={d?.ground_fault_power ?? false}
                    fuelLevel={d?.fuel_level ?? null}
                  />
                </>
              )}
            </div>
          )}
          {isVisible("correlation") && (
            <div className="card">
              <div className="card-header"><span className="card-header-icon">📊</span> Корреляция параметров</div>
              <CorrelationMatrix history={history} />
            </div>
          )}
        </div>
      )}

      {/* Row 5: Consist + Events */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {isVisible("consist") && (
          <div className="card">
            <div className="card-header"><span className="card-header-icon">🚂</span> Состав</div>
            <ConsistView locoId={locoId} />
          </div>
        )}
        {isVisible("events") && (
          <div className="card">
            <div className="card-header"><span className="card-header-icon">📋</span> Журнал событий</div>
            <IncidentTimeline locoId={locoId} />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{ display: "flex", gap: "2rem", padding: "0.75rem 0", marginTop: "1rem", fontSize: "0.65rem", color: "var(--outline)", fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        <span>● Связь с системой: {status === "online" ? "активно" : "потеряно"}</span>
        <span>● GPS: захвачен</span>
        <span style={{ marginLeft: "auto" }}>Оператор: {localStorage.getItem("username") || "DRV_ALEX_V"}</span>
      </div>
    </>
  );
}
