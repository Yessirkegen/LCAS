const API_URL = import.meta.env.VITE_API_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" ? `${window.location.protocol}//${window.location.host}` : "http://localhost:8000");
const WS_URL = import.meta.env.VITE_WS_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}` : "ws://localhost:8000");

export async function login(username: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}

export async function fetchLocomotives() {
  const res = await fetch(`${API_URL}/api/locomotives`);
  return res.json();
}

export async function fetchLocoState(locoId: string) {
  const res = await fetch(`${API_URL}/api/locomotives/${locoId}/state`);
  return res.json();
}

export async function fetchTelemetryHistory(locoId: string, minutes = 5) {
  const res = await fetch(`${API_URL}/api/locomotives/${locoId}/telemetry?minutes=${minutes}`);
  return res.json();
}

export async function fetchThresholds() {
  const res = await fetch(`${API_URL}/api/admin/thresholds`);
  return res.json();
}

export async function fetchWeights() {
  const res = await fetch(`${API_URL}/api/admin/weights`);
  return res.json();
}

export async function startSimulator(locoId = "TE33A-0142", hz = 1, count = 1) {
  const res = await fetch(`${API_URL}/simulator/start?locomotive_id=${locoId}&route=loop&hz=${hz}&count=${count}`, {
    method: "POST",
  });
  return res.json();
}

export async function stopSimulator(locoId?: string) {
  const url = locoId
    ? `${API_URL}/simulator/stop?locomotive_id=${locoId}`
    : `${API_URL}/simulator/stop`;
  const res = await fetch(url, { method: "POST" });
  return res.json();
}

export async function runScenario(locoId: string, scenario: string, duration = 30) {
  const res = await fetch(
    `${API_URL}/simulator/scenario?locomotive_id=${locoId}&scenario=${scenario}&duration_seconds=${duration}`,
    { method: "POST" },
  );
  return res.json();
}

export function getWsUrl(locoId?: string): string {
  const token = localStorage.getItem("token") || "";
  const loco = locoId || "";
  return `${WS_URL}/ws?token=${token}&loco_id=${loco}`;
}
