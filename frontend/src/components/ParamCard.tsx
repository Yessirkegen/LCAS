interface Props {
  label: string;
  value: number | boolean | null | undefined;
  unit?: string;
  status?: "normal" | "warning" | "critical";
  precision?: number;
}

export default function ParamCard({ label, value, unit = "", status = "normal", precision = 1 }: Props) {
  const statusClass = `param-status-${status}`;
  const displayValue = value === null || value === undefined
    ? "—"
    : typeof value === "boolean"
      ? (value ? "ДА" : "НЕТ")
      : typeof value === "number"
        ? value.toFixed(precision)
        : String(value);

  return (
    <div className={`param-card ${statusClass}`}>
      <span className="param-label">{label}</span>
      <span className="param-value">
        {displayValue}
        {unit && <span className="param-unit"> {unit}</span>}
      </span>
    </div>
  );
}
