import { useState } from "react";

interface Alert {
  level: string;
  message: string;
  timestamp: string;
  locomotive_id: string;
}

interface Props {
  alerts: Alert[];
  fleetCount: number;
  criticalCount: number;
}

export default function PictureInPicture({ alerts, fleetCount, criticalCount }: Props) {
  const [minimized, setMinimized] = useState(false);

  if (minimized) {
    return (
      <div className="pip-minimized" onClick={() => setMinimized(false)}>
        <span className="pip-badge">{criticalCount > 0 ? `🔴 ${criticalCount}` : `🟢 ${fleetCount}`}</span>
      </div>
    );
  }

  return (
    <div className="pip-window">
      <div className="pip-header">
        <span className="pip-title">Флот: {fleetCount} лок</span>
        <button className="pip-minimize" onClick={() => setMinimized(true)}>_</button>
      </div>
      <div className="pip-content">
        {alerts.length === 0 ? (
          <span className="pip-ok">Нет алертов</span>
        ) : (
          alerts.slice(0, 5).map((a, i) => (
            <div key={i} className={`pip-alert pip-${a.level.toLowerCase()}`}>
              <span className="pip-loco">{a.locomotive_id}</span>
              <span className="pip-msg">{a.message.substring(0, 40)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
