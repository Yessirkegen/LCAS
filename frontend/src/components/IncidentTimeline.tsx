import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Event {
  timestamp: string;
  type: string;
  message: string;
  details: Record<string, any>;
}

interface Incident {
  id: string;
  started_at: string;
  trigger: string;
  status: string;
  events: Event[];
}

interface Props {
  locoId: string;
}

const TYPE_ICONS: Record<string, string> = {
  alert: "⚠",
  incident_start: "🔴",
  incident_resolved: "✅",
  telemetry: "📊",
};

export default function IncidentTimeline({ locoId }: Props) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const load = () => {
      fetch(`${API_URL}/api/locomotives/${locoId}/incident`)
        .then((r) => r.json())
        .then((d) => setIncident(d.incident))
        .catch(() => {});
      fetch(`${API_URL}/api/locomotives/${locoId}/events?last=30`)
        .then((r) => r.json())
        .then((d) => setEvents(d.events || []))
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [locoId]);

  const displayEvents = incident?.events || events;
  const alertEvents = displayEvents.filter((e) => e.type !== "telemetry");

  return (
    <div className="incident-timeline">
      {incident && (
        <div className="incident-banner">
          <span className="incident-badge">{incident.status === "active" ? "ИНЦИДЕНТ" : "RESOLVED"}</span>
          <span>{incident.trigger}</span>
          <span className="incident-time">
            {new Date(incident.started_at).toLocaleTimeString("ru-RU")}
          </span>
        </div>
      )}

      <div className="event-list">
        {alertEvents.length === 0 && <div className="event-empty">Нет событий</div>}
        {alertEvents.slice().reverse().map((event, i) => (
          <div key={i} className={`event-item event-${event.type}`}>
            <span className="event-icon">{TYPE_ICONS[event.type] || "•"}</span>
            <span className="event-time">
              {new Date(event.timestamp).toLocaleTimeString("ru-RU")}
            </span>
            <span className="event-msg">{event.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
