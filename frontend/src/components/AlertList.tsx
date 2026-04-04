interface Alert {
  id: string;
  level: string;
  param: string;
  message: string;
  timestamp: string;
  status: string;
}

interface Props {
  alerts: Alert[];
}

const LEVEL_COLORS: Record<string, string> = {
  WARNING: "var(--red)",
  CAUTION: "var(--yellow)",
  ADVISORY: "var(--accent)",
};

export default function AlertList({ alerts }: Props) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="alert-list-empty">
        <span style={{ color: "var(--green)" }}>Нет активных алертов</span>
      </div>
    );
  }

  return (
    <div className="alert-list">
      {alerts.map((alert, i) => (
        <div
          key={alert.id || i}
          className={`alert-card alert-${alert.level.toLowerCase()}`}
          style={{ borderLeftColor: LEVEL_COLORS[alert.level] || "var(--border)" }}
        >
          <div className="alert-header">
            <span className="alert-level" style={{ color: LEVEL_COLORS[alert.level] }}>
              {alert.level}
            </span>
            <span className="alert-time">
              {new Date(alert.timestamp).toLocaleTimeString("ru-RU")}
            </span>
          </div>
          <div className="alert-message">{alert.message}</div>
        </div>
      ))}
    </div>
  );
}
