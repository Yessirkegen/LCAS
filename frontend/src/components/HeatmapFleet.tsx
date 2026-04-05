import { useEffect, useRef } from "react";

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
  normal: "#75ff9e",
  attention: "#fdd400",
  critical: "#ffb4ab",
};

const CELL = 8;
const GAP = 2;

export default function HeatmapFleet({ locomotives, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const locoRef = useRef(locomotives);
  locoRef.current = locomotives;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cols = Math.floor((canvas.parentElement?.clientWidth || 400) / (CELL + GAP)) || 40;
    const rows = Math.ceil(locomotives.length / cols);
    canvas.width = cols * (CELL + GAP);
    canvas.height = rows * (CELL + GAP);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < locomotives.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      ctx.fillStyle = COLORS[locomotives[i].hi_category] || "#555";
      ctx.fillRect(col * (CELL + GAP), row * (CELL + GAP), CELL, CELL);
    }
  }, [locomotives]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onSelect) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cols = Math.floor(canvas.width / (CELL + GAP));
    const col = Math.floor(x / (CELL + GAP));
    const row = Math.floor(y / (CELL + GAP));
    const idx = row * cols + col;
    if (idx < locoRef.current.length) {
      onSelect(locoRef.current[idx].locomotive_id);
    }
  };

  return <canvas ref={canvasRef} onClick={handleClick} style={{ cursor: "pointer", width: "100%", imageRendering: "pixelated" }} />;
}
