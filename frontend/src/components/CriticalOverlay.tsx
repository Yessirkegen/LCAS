interface Alert {
  level: string;
  message: string;
  voice_text?: string;
  param: string;
  status?: string;
}

const RECOMMENDATIONS: Record<string, string> = {
  water_temp_inlet: "REDUCE DIESEL LOAD IMMEDIATELY",
  water_temp_outlet: "REDUCE DIESEL LOAD IMMEDIATELY",
  oil_temp_inlet: "REDUCE DIESEL LOAD IMMEDIATELY",
  oil_temp_outlet: "REDUCE DIESEL LOAD IMMEDIATELY",
  ground_fault_power: "НАГРУЗКА СНЯТА АВТОМАТИЧЕСКИ (ДГУ)",
  ground_fault_aux: "ПРОВЕРИТЬ ВСПОМОГАТЕЛЬНЫЕ СИСТЕМЫ",
  main_reservoir_pressure: "ПРОВЕРИТЬ ПНЕВМОСИСТЕМУ",
  fuel_level: "ТРЕБУЕТСЯ ДОЗАПРАВКА",
};

interface Props {
  alerts: Alert[];
  onAcknowledge: () => void;
}

export default function CriticalOverlay({ alerts, onAcknowledge }: Props) {
  const criticalAlerts = alerts.filter((a) => a.level === "WARNING" && a.status !== "acknowledged");
  if (criticalAlerts.length === 0) return null;

  const alert = criticalAlerts[0];

  return (
    <div className="critical-overlay">
      <div className="critical-card">
        <div className="critical-hazard-stripe" />
        <div className="critical-body">
          <div className="critical-icon">⚠</div>
          <div className="critical-title">[!] {alert.message}</div>
          <div className="critical-subtitle">
            СТАТУС: ОПАСНО
          </div>
          <div className="critical-action">
            <div className="critical-action-label">Recommended Action</div>
            <div className="critical-action-text">
              {RECOMMENDATIONS[alert.param] || "ПРИНЯТЬ МЕРЫ"}
            </div>
          </div>
          <button className="critical-ack-btn" onClick={onAcknowledge}>
            Принял
          </button>
        </div>
      </div>
    </div>
  );
}
