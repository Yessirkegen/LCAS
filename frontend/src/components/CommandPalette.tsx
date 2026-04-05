import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  locomotives: Array<{ locomotive_id: string; health_index: number | null; hi_category: string }>;
}

const ACTIONS = [
  { id: "cabin", label: "Кабина", path: "/cabin" },
  { id: "dispatch", label: "Центр управления", path: "/dispatch" },
  { id: "admin", label: "Администрирование", path: "/admin" },
  { id: "simulator", label: "Симулятор", path: "/simulator" },
  { id: "thresholds", label: "Настройка порогов", path: "/admin" },
  { id: "docs", label: "Документация API", path: "http://localhost:8000/docs" },
];

export default function CommandPalette({ open, onClose, locomotives }: Props) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  const q = query.toLowerCase();

  const locoResults = locomotives
    .filter((l) => l.locomotive_id.toLowerCase().includes(q))
    .slice(0, 8);

  const actionResults = ACTIONS.filter((a) => a.label.toLowerCase().includes(q));

  const handleSelect = (path: string) => {
    onClose();
    if (path.startsWith("http")) {
      window.open(path, "_blank");
    } else {
      navigate(path);
    }
  };

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        <input
          className="cmd-input"
          placeholder="Поиск локомотива, страницы..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <div className="cmd-results">
          {locoResults.length > 0 && (
            <div className="cmd-group">
              <div className="cmd-group-label">Локомотивы</div>

              {locoResults.map((l) => (
                <div
                  key={l.locomotive_id}
                  className="cmd-item"
                  onClick={() => handleSelect(`/dispatch/loco/${l.locomotive_id}`)}
                >
                  <span className={`loco-status-dot ${l.hi_category}`} />
                  <span>{l.locomotive_id}</span>
                  <span className="cmd-item-meta">HI: {l.health_index ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
          {actionResults.length > 0 && (
            <div className="cmd-group">
              <div className="cmd-group-label">Страницы</div>
              {actionResults.map((a) => (
                <div key={a.id} className="cmd-item" onClick={() => handleSelect(a.path)}>
                  <span>{a.label}</span>
                </div>
              ))}
            </div>
          )}
          {locoResults.length === 0 && actionResults.length === 0 && (
            <div className="cmd-empty">Не найдено</div>
          )}
        </div>
      </div>
    </div>
  );
}
