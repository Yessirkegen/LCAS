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
  water_temp_inlet: "Темп. воды (вход)",
  water_temp_outlet: "Темп. воды (выход)",
  oil_temp_inlet: "Темп. масла (вход)",
  oil_temp_outlet: "Темп. масла (выход)",
  air_temp_collector: "Темп. воздуха колл.",
  fuel_temp: "Темп. топлива",
  oil_pressure_kpa: "Давление масла",
  water_pressure_kpa: "Давление воды",
  air_pressure_kpa: "Давление воздуха",
  air_consumption: "Расход воздуха",
  main_reservoir_pressure: "Давление ГР",
  brake_line_pressure: "Тормозная маг.",
  traction_current: "Ток тяги",
  traction_effort: "Тяговое усилие",
  generator_voltage: "Напряж. генератора",
  generator_current: "Ток генератора",
  fuel_level: "Уровень топлива",
  fuel_consumption: "Расход топлива",
  speed_kmh: "Скорость",
  catenary_voltage: "Напряж. сети",
  pantograph_current: "Ток пантографа",
  inverter_current: "Ток инвертора",
  inverter_temp: "Темп. инвертора",
  ted_avg_current: "Ток ТЭД",
  ted_avg_temp: "Темп. ТЭД средн.",
  ted_max_temp: "Темп. ТЭД макс.",
  cooling_water_temp: "Темп. охлаждения",
};

function translateParam(param: string): string {
  const normalized = param.replace(/ /g, "_");
  if (PARAM_LABELS[normalized]) return PARAM_LABELS[normalized];
  if (PARAM_LABELS[param]) return PARAM_LABELS[param];

  const s = param.replace(/_/g, " ").toLowerCase();
  if (s.includes("oil") && s.includes("temp") && s.includes("outlet")) return "Темп. масла (выход)";
  if (s.includes("oil") && s.includes("temp") && s.includes("inlet")) return "Темп. масла (вход)";
  if (s.includes("water") && s.includes("temp") && s.includes("outlet")) return "Темп. воды (выход)";
  if (s.includes("water") && s.includes("temp") && s.includes("inlet")) return "Темп. воды (вход)";
  if (s.includes("oil") && s.includes("press")) return "Давление масла";
  if (s.includes("water") && s.includes("press")) return "Давление воды";
  if (s.includes("air") && s.includes("temp")) return "Темп. воздуха";
  if (s.includes("fuel") && s.includes("temp")) return "Темп. топлива";
  if (s.includes("fuel") && s.includes("level")) return "Уровень топлива";
  if (s.includes("fuel") && s.includes("consum")) return "Расход топлива";
  if (s.includes("traction") && s.includes("current")) return "Ток тяги";
  if (s.includes("speed")) return "Скорость";
  if (s.includes("main") && s.includes("reservoir")) return "Давление ГР";
  if (s.includes("brake") && s.includes("line")) return "Тормозная маг.";
  if (s.includes("air") && s.includes("consum")) return "Расход воздуха";
  if (s.includes("generator") && s.includes("voltage")) return "Напряж. генератора";

  return param;
}

export default function HealthGauge({ value, letter, category, topFactors, predictedMinutes }: Props) {
  const color = COLORS[category as keyof typeof COLORS] || COLORS.normal;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference * 0.75;

  return (
    <div className="hi-gauge-container">
      <svg viewBox="0 0 200 200" className="hi-gauge-svg" style={{ width: "100%", maxWidth: "420px" }}>
        {/* Track */}
        <circle
          cx="100" cy="105" r={radius}
          fill="none" stroke="var(--surface-container-highest, #2f333b)" strokeWidth="16"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeLinecap="round"
          transform="rotate(135 100 105)"
        />
        {/* Progress */}
        <circle
          cx="100" cy="105" r={radius}
          fill="none" stroke={color} strokeWidth="16"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(135 100 105)"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
        {/* HI Number */}
        <text x="100" y="97" textAnchor="middle" dominantBaseline="central" fill="var(--on-surface, #e1e3de)" fontSize="56" fontWeight="700" fontFamily="Space Grotesk, sans-serif">
          {Math.round(value)}
        </text>
        {/* Letter */}
        <text x="100" y="130" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="26" fontWeight="700" fontFamily="Space Grotesk, sans-serif">
          {letter}
        </text>
        {/* Category label */}
        <text x="100" y="175" textAnchor="middle" dominantBaseline="central" fill="var(--on-surface-variant, #bacbb9)" fontSize="11" fontFamily="Space Grotesk, sans-serif" letterSpacing="0.12em">
          {category === "normal" ? "НОРМА" : category === "attention" ? "ВНИМАНИЕ" : "КРИТИЧНО"}
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
              <span className="hi-factor-name">{translateParam(f.param)}</span>
              <span className="hi-factor-impact">-{f.impact.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
