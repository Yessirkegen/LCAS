import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const ingestLatency = new Trend('ingest_latency');
const stateLatency = new Trend('state_latency');

const BASE = __ENV.BASE_URL || 'http://localhost:8000';

export const options = {
  scenarios: {
    normal_load: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
    peak_load: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      stages: [
        { target: 500, duration: '30s' },
        { target: 1700, duration: '30s' },
        { target: 1700, duration: '60s' },
        { target: 100, duration: '30s' },
      ],
      preAllocatedVUs: 200,
      maxVUs: 500,
      startTime: '60s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.01'],
  },
};

function randomTelemetry(locoId) {
  return JSON.stringify({
    locomotive_id: locoId,
    speed_kmh: 40 + Math.random() * 80,
    water_temp_inlet: 75 + Math.random() * 15,
    water_temp_outlet: 80 + Math.random() * 15,
    oil_temp_inlet: 70 + Math.random() * 15,
    oil_temp_outlet: 73 + Math.random() * 15,
    water_pressure_kpa: 100 + Math.random() * 250,
    oil_pressure_kpa: 200 + Math.random() * 500,
    air_pressure_kpa: 100 + Math.random() * 250,
    air_consumption: 1500 + Math.random() * 1700,
    main_reservoir_pressure: 7.5 + Math.random() * 2,
    brake_line_pressure: 4.8 + Math.random() * 0.7,
    traction_current: 200 + Math.random() * 600,
    fuel_level: 20 + Math.random() * 70,
    fuel_consumption: 100 + Math.random() * 200,
    ground_fault_power: false,
    ground_fault_aux: false,
    wheel_slip: false,
    lat: 50 + Math.random() * 2,
    lon: 71 + Math.random() * 3,
  });
}

export default function () {
  const locoId = `TE33A-${String(Math.floor(Math.random() * 1700)).padStart(4, '0')}`;

  const ingestRes = http.post(`${BASE}/ingest/telemetry`, randomTelemetry(locoId), {
    headers: { 'Content-Type': 'application/json' },
  });
  ingestLatency.add(ingestRes.timings.duration);
  check(ingestRes, { 'ingest 200': (r) => r.status === 200 || r.status === 429 }) || errorRate.add(1);

  if (Math.random() < 0.1) {
    const stateRes = http.get(`${BASE}/api/locomotives`);
    stateLatency.add(stateRes.timings.duration);
    check(stateRes, { 'fleet 200': (r) => r.status === 200 }) || errorRate.add(1);
  }
}
