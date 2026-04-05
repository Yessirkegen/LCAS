import ReactECharts from "echarts-for-react";

interface Props {
  history: Array<{ time: string; [key: string]: any }>;
  fields: Array<{ key: string; name: string; color: string }>;
  height?: number;
}

export default function TrendChart({ history, fields, height = 250 }: Props) {
  const option = {
    backgroundColor: "transparent",
    grid: { top: 30, right: 20, bottom: 30, left: 50 },
    tooltip: {
      trigger: "axis",
      backgroundColor: "#1a1d20",
      borderColor: "rgba(138,155,137,0.15)",
      textStyle: { color: "#e1e3de", fontSize: 11, fontFamily: "Inter" },
    },
    legend: {
      data: fields.map((f) => f.name),
      textStyle: { color: "#bacbb9", fontSize: 10, fontFamily: "Inter" },
      top: 0,
    },
    xAxis: {
      type: "category",
      data: history.map((h) => {
        const d = new Date(h.time);
        return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
      }),
      axisLabel: { color: "#8a9b89", fontSize: 9, fontFamily: "Space Grotesk" },
      axisLine: { lineStyle: { color: "rgba(138,155,137,0.15)" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#8a9b89", fontSize: 9, fontFamily: "Space Grotesk" },
      splitLine: { lineStyle: { color: "rgba(138,155,137,0.08)" } },
    },
    series: fields.map((f) => ({
      name: f.name,
      type: "line",
      data: history.map((h) => h[f.key] ?? null),
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: f.color },
      itemStyle: { color: f.color },
    })),
    animation: false,
  };

  return <ReactECharts option={option} style={{ height }} notMerge lazyUpdate />;
}
