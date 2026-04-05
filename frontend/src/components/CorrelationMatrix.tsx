interface Props {
  history: Array<{ [key: string]: any }>;
}

const PARAMS = ["speed_kmh", "water_temp_outlet", "oil_temp_outlet", "oil_pressure_kpa", "traction_current", "fuel_consumption"];
const SHORT = { speed_kmh: "Скор", water_temp_outlet: "Вода", oil_temp_outlet: "Масло", oil_pressure_kpa: "Давл", traction_current: "Тяга", fuel_consumption: "Расх" };

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 5) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx, yi = y[i] - my;
    num += xi * yi; dx += xi * xi; dy += yi * yi;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

export default function CorrelationMatrix({ history }: Props) {
  if (history.length < 10) return <div className="corr-empty">Недостаточно данных</div>;

  const vals: Record<string, number[]> = {};
  for (const p of PARAMS) vals[p] = history.map((h) => h[p]).filter((v) => v != null);

  return (
    <div className="corr-matrix">
      <table className="corr-table">
        <thead>
          <tr><th></th>{PARAMS.map((p) => <th key={p}>{(SHORT as any)[p]}</th>)}</tr>
        </thead>
        <tbody>
          {PARAMS.map((p1) => (
            <tr key={p1}>
              <td className="corr-label">{(SHORT as any)[p1]}</td>
              {PARAMS.map((p2) => {
                const r = p1 === p2 ? 1 : pearson(vals[p1], vals[p2]);
                const color = r > 0.7 ? "var(--green)" : r > 0.4 ? "var(--yellow)" : r < -0.4 ? "var(--red)" : "var(--text-secondary)";
                const bg = `${color}15`;
                return <td key={p2} style={{ color, background: bg, fontWeight: Math.abs(r) > 0.7 ? 600 : 400 }}>{r.toFixed(2)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
