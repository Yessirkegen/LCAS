import { useEffect } from "react";

const COLORS: Record<string, string> = {
  normal: "#22c55e",
  attention: "#eab308",
  critical: "#ef4444",
};

function createFaviconCanvas(color: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  ctx.beginPath();
  ctx.arc(16, 16, 14, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();
  return canvas.toDataURL("image/png");
}

export function useFavicon(hi: number | null, category: string, locoId: string) {
  useEffect(() => {
    if (hi === null) return;

    const color = COLORS[category] || COLORS.normal;
    const favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
      || document.createElement("link");
    favicon.rel = "icon";
    favicon.href = createFaviconCanvas(color);
    document.head.appendChild(favicon);

    const prefix = category === "critical" ? "🔴" : category === "attention" ? "🟡" : "🟢";
    document.title = `${prefix} HI:${Math.round(hi)} — ${locoId}`;
  }, [hi, category, locoId]);
}
