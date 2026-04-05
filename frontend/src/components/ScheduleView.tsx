import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface StationSchedule {
  station: string;
  km: number;
  planned: string;
  actual: string | null;
  eta: string | null;
  delay_minutes: number;
  status: string;
  speed_limit: number | null;
}

interface Props {
  locoId: string;
}

export default function ScheduleView({ locoId }: Props) {
  const [schedule, setSchedule] = useState<StationSchedule[]>([]);

  useEffect(() => {
    const load = () => {
      fetch(`${API_URL}/api/locomotives/${locoId}/schedule`)
        .then((r) => r.json())
        .then((d) => setSchedule(d.schedule || []))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [locoId]);

  if (schedule.length === 0) return (
    <div style={{ padding: "1rem", textAlign: "center", color: "var(--outline)", fontSize: "0.75rem" }}>
      Маршрут не определён. Запустите симулятор.
    </div>
  );

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="schedule-view">
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Станция</th>
            <th>км</th>
            <th>План</th>
            <th>Факт/ETA</th>
            <th>Откл.</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((s) => (
            <tr key={s.station} className={`schedule-row ${s.status}`}>
              <td className="station-name">
                {s.station}
                {s.speed_limit && <span className="speed-limit-badge">{s.speed_limit}</span>}
              </td>
              <td>{s.km}</td>
              <td>{formatTime(s.planned)}</td>
              <td>{formatTime(s.actual || s.eta)}</td>
              <td className={s.delay_minutes > 5 ? "delay-bad" : s.delay_minutes > 0 ? "delay-warn" : "delay-ok"}>
                {s.delay_minutes > 0 ? `+${s.delay_minutes.toFixed(0)} мин` : "вовремя"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
