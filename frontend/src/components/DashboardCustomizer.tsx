import { useState, useEffect } from "react";

const ALL_PANELS = [
  { id: "hi", label: "Индекс здоровья", default: true },
  { id: "speed", label: "Скорость", default: true },
  { id: "alerts", label: "Алерты", default: true },
  { id: "temperatures", label: "Температуры", default: true },
  { id: "pressures", label: "Давления", default: true },
  { id: "electrical", label: "Электрика", default: true },
  { id: "fuel", label: "Топливо", default: true },
  { id: "trends", label: "Тренды", default: true },
  { id: "correlation", label: "Корреляция", default: true },
  { id: "consist", label: "Состав", default: true },
  { id: "schedule", label: "Расписание", default: true },
  { id: "events", label: "Лента событий", default: true },
  { id: "loco3d", label: "3D-модель", default: true },
];

const STORAGE_KEY = "dashboard_panels";

export function useDashboardPanels() {
  const [panels, setPanels] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return Object.fromEntries(ALL_PANELS.map((p) => [p.id, p.default]));
  });

  const toggle = (id: string) => {
    setPanels((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const isVisible = (id: string) => panels[id] !== false;

  return { panels, toggle, isVisible };
}

interface Props {
  panels: Record<string, boolean>;
  onToggle: (id: string) => void;
  open: boolean;
  onClose: () => void;
}

export default function DashboardCustomizer({ panels, onToggle, open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="customizer-overlay" onClick={onClose}>
      <div className="customizer-card" onClick={(e) => e.stopPropagation()}>
        <h3>Настройка панелей</h3>
        <div className="customizer-list">
          {ALL_PANELS.map((p) => (
            <label key={p.id} className="customizer-item">
              <input
                type="checkbox"
                checked={panels[p.id] !== false}
                onChange={() => onToggle(p.id)}
              />
              <span>{p.label}</span>
            </label>
          ))}
        </div>
        <button className="customizer-close" onClick={onClose}>Готово</button>
      </div>
    </div>
  );
}
