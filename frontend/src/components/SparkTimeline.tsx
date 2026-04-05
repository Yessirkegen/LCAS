interface Props {
  locomotiveId: string;
  healthIndex: number | null;
  category: string;
}

const COLORS: Record<string, string> = {
  normal: "var(--green)",
  attention: "var(--yellow)",
  critical: "var(--red)",
};

export default function SparkTimeline({ locomotiveId, healthIndex, category }: Props) {
  const color = COLORS[category] || "var(--border)";
  const width = Math.max(0, Math.min(100, healthIndex ?? 0));

  return (
    <div className="spark-row">
      <span className="spark-id">{locomotiveId}</span>
      <div className="spark-bar">
        <div className="spark-fill" style={{ width: `${width}%`, background: color }} />
      </div>
      <span className="spark-value" style={{ color }}>{healthIndex ?? "—"}</span>
    </div>
  );
}
