interface Props {
  value: number;
  letter: string;
  category: string;
  topFactors?: Array<{ param: string; value: number; score: number; impact: number }>;
  predictedMinutes?: number;
}

const COLORS = {
  normal: "#75ff9e",
  attention: "#fdd400",
  critical: "#ffb4ab",
};

const PARAM_LABELS: Record<string, string> = {
  water_temp_inlet: "Темп воды (вх)",
  water_temp_outlet: "Темп воды (вых)",
  oil_temp_inlet: "Темп масла (вх)",
  oil_temp_outlet: "Темп масла (вых)",
  oil_pressure_kpa: "Давление масла",
  water_pressure_kpa: "Давление воды",
  air_pressure_kpa: "Давление воздуха",
  main_reservoir_pressure: "Давление ГР",
  brake_line_pressure: "Тормозная маг.",
  traction_current: "Тяга ТЭД",
  fuel_level: "Топливо",
  speed_kmh: "Скорость",
  air_consumption: "Расход воздуха",
};

export default function HealthGauge({ value, letter, category, topFactors, predictedMinutes }: Props) {
  const color = COLORS[category as keyof typeof COLORS] || COLORS.normal;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference * 0.75;

  return (
    <div className="hi-gauge-container">
      <svg viewBox="0 0 200 180" className="hi-gauge-svg">
        <circle
          cx="100" cy="100" r={radius}
          fill="none" stroke="var(--border)" strokeWidth="12"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
          transform="rotate(135 100 100)"
        />
        <circle
          cx="100" cy="100" r={radius}
          fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(135 100 100)"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        <text x="100" y="90" textAnchor="middle" fill="var(--text-primary)" fontSize="36" fontWeight="700">
          {Math.round(value)}
        </text>
        <text x="100" y="115" textAnchor="middle" fill={color} fontSize="20" fontWeight="600">
          {letter}
        </text>
        <text x="100" y="145" textAnchor="middle" fill="var(--text-secondary)" fontSize="12">
          {category === "normal" ? "Норма" : category === "attention" ? "Внимание" : "Критично"}
        </text>
      </svg>

      {predictedMinutes && (
        <div className="hi-prediction" style={{ color: COLORS.attention }}>
          Прогноз: критично через {predictedMinutes} мин
        </div>
      )}

      {topFactors && topFactors.length > 0 && (
        <div className="hi-factors">
          {topFactors.map((f, i) => (
            <div key={i} className="hi-factor-row">
              <span className="hi-factor-name">{PARAM_LABELS[f.param] || f.param}</span>
              <span className="hi-factor-impact">-{f.impact.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
