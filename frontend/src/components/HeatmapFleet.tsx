interface LocoSummary {
  locomotive_id: string;
  health_index: number | null;
  hi_category: string;
}

interface Props {
  locomotives: LocoSummary[];
  onSelect?: (id: string) => void;
}

const COLORS: Record<string, string> = {
  normal: "var(--green)",
  attention: "var(--yellow)",
  critical: "var(--red)",
};

export default function HeatmapFleet({ locomotives, onSelect }: Props) {
  return (
    <div className="heatmap-grid">
      {locomotives.map((loco) => (
        <div
          key={loco.locomotive_id}
          className="heatmap-cell"
          style={{ background: COLORS[loco.hi_category] || "var(--border)" }}
          title={`${loco.locomotive_id} — HI: ${loco.health_index ?? "—"}`}
          onClick={() => onSelect?.(loco.locomotive_id)}
        />
      ))}
    </div>
  );
}
