"""KZ8A electric locomotive simulator — generates realistic electric traction telemetry."""

import random
from datetime import datetime, timezone
from app.models.telemetry_kz8a import KZ8ATelemetryPacket
from app.simulator.routes_osm import ROUTES_KZ, ALL_ROUTE_IDS


class KZ8ASimulator:
    def __init__(self, locomotive_id: str = "KZ8A-0001", route: str = "astana_karaganda"):
        self.locomotive_id = locomotive_id
        fallback = next(iter(ROUTES_KZ.values()))
        self.route_data = ROUTES_KZ.get(route, fallback)
        self.total_km = self.route_data["total_km"]

        self.speed = 70.0
        self.distance_km = 0.0

        self.catenary_voltage = 25000.0
        self.pantograph_current = 400.0
        self.pantograph_up = True

        self.transformer_oil_temp = 55.0
        self.inverter_current = 600.0
        self.inverter_temp = 45.0

        self.ted_avg_current = 550.0
        self.ted_avg_temp = 85.0
        self.ted_max_temp = 95.0

        self.regen_active = False
        self.regen_power = 0.0

        self.main_res_press = 8.5
        self.brake_press = 5.0
        self.compressor = False

        self.cooling_fan_rpm = 1200.0
        self.cooling_water_temp = 60.0

        self.ground_fault = False
        self.fire_alarm = False
        self.section2_connected = True

    def _noise(self, base: float, pct: float = 0.02) -> float:
        return base * (1 + random.gauss(0, pct))

    def _interpolate_position(self) -> tuple[float, float]:
        points = self.route_data["points"]
        dist = self.distance_km % self.total_km
        for i in range(len(points) - 1):
            _, _, km0 = points[i]
            _, _, km1 = points[i + 1]
            if km0 <= dist <= km1:
                t = (dist - km0) / (km1 - km0) if km1 != km0 else 0
                lat = points[i][0] + t * (points[i + 1][0] - points[i][0])
                lon = points[i][1] + t * (points[i + 1][1] - points[i][1])
                return lat, lon
        return points[0][0], points[0][1]

    def tick(self, dt: float = 1.0) -> dict:
        self.distance_km += self.speed / 3600 * dt
        if self.distance_km >= self.total_km:
            self.distance_km = self.distance_km % self.total_km

        speed_factor = self.speed / 80.0

        self.catenary_voltage = 25000 + random.gauss(0, 200)
        self.pantograph_current = 400 * speed_factor + random.gauss(0, 20)

        self.transformer_oil_temp += (55 * speed_factor - self.transformer_oil_temp) * 0.01 * dt
        self.inverter_current = 600 * speed_factor + random.gauss(0, 15)
        self.inverter_temp += (45 * speed_factor - self.inverter_temp) * 0.015 * dt

        self.ted_avg_current = 550 * speed_factor + random.gauss(0, 20)
        self.ted_avg_temp += (85 * speed_factor - self.ted_avg_temp) * 0.01 * dt
        self.ted_max_temp = self.ted_avg_temp + random.uniform(5, 15)

        self.cooling_water_temp += (60 * speed_factor - self.cooling_water_temp) * 0.01 * dt
        self.cooling_fan_rpm = 1200 * speed_factor + random.gauss(0, 30)

        self.main_res_press += random.gauss(-0.002, 0.005) * dt
        if self.main_res_press < 7.5:
            self.compressor = True
        if self.main_res_press > 9.5:
            self.compressor = False
        if self.compressor:
            self.main_res_press += 0.05 * dt
        self.main_res_press = max(5.0, min(10.5, self.main_res_press))

        lat, lon = self._interpolate_position()

        data = {
            "locomotive_id": self.locomotive_id,
            "locomotive_type": "KZ8A",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "speed_kmh": round(self._noise(self.speed, 0.01), 1),
            "wheel_slip": False,
            "catenary_voltage": round(self.catenary_voltage, 0),
            "pantograph_current": round(self.pantograph_current, 1),
            "pantograph_up": self.pantograph_up,
            "transformer_oil_temp": round(self._noise(self.transformer_oil_temp), 1),
            "inverter_current": round(self.inverter_current, 1),
            "inverter_temp": round(self._noise(self.inverter_temp), 1),
            "ted_avg_current": round(self.ted_avg_current, 1),
            "ted_avg_temp": round(self._noise(self.ted_avg_temp), 1),
            "ted_max_temp": round(self.ted_max_temp, 1),
            "regen_active": self.regen_active,
            "regen_power_kw": round(self.regen_power, 0),
            "main_reservoir_pressure": round(self.main_res_press, 2),
            "brake_line_pressure": round(self.brake_press + random.gauss(0, 0.03), 2),
            "compressor_active": self.compressor,
            "cooling_fan_rpm": round(self.cooling_fan_rpm, 0),
            "cooling_water_temp": round(self._noise(self.cooling_water_temp), 1),
            "ground_fault": self.ground_fault,
            "fire_alarm": self.fire_alarm,
            "section2_connected": self.section2_connected,
            "fuel_level": None,
            "fuel_consumption": None,
            "water_temp_inlet": round(self.cooling_water_temp, 1),
            "water_temp_outlet": round(self.cooling_water_temp + 5, 1),
            "oil_temp_inlet": round(self.transformer_oil_temp, 1),
            "oil_temp_outlet": round(self.transformer_oil_temp + 3, 1),
            "traction_current": round(self.ted_avg_current, 1),
            "ground_fault_power": self.ground_fault,
            "ground_fault_aux": False,
            "health_index": None,
        }
        return data

    def apply_scenario(self, scenario: str, progress: float):
        if scenario == "overheat_ted":
            self.ted_avg_temp += (160 - self.ted_avg_temp) * 0.05 * progress
        elif scenario == "voltage_drop":
            self.catenary_voltage = 25000 - progress * 8000
        elif scenario == "ground_fault":
            if progress > 0.5:
                self.ground_fault = True
        elif scenario == "pantograph_down":
            if progress > 0.3:
                self.pantograph_up = False
                self.catenary_voltage = 0
                self.speed = max(0, self.speed - 2)
