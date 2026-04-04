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
      backgroundColor: "#1a2235",
      borderColor: "#374151",
      textStyle: { color: "#e5e7eb", fontSize: 12 },
    },
    legend: {
      data: fields.map((f) => f.name),
      textStyle: { color: "#9ca3af", fontSize: 11 },
      top: 0,
    },
    xAxis: {
      type: "category",
      data: history.map((h) => {
        const d = new Date(h.time);
        return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
      }),
      axisLabel: { color: "#6b7280", fontSize: 10 },
      axisLine: { lineStyle: { color: "#374151" } },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#6b7280", fontSize: 10 },
      splitLine: { lineStyle: { color: "#1f2937" } },
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
