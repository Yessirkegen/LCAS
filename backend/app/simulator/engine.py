"""Telemetry simulator for TE33A locomotive — generates realistic correlated data."""

import asyncio
import math
import random
import time
from datetime import datetime, timezone
from typing import Optional

from app.models.telemetry import TelemetryPacket
from app.simulator.routes_osm import ROUTES_KZ as ROUTES


class LocomotiveSimulator:
    def __init__(self, locomotive_id: str = "TE33A-0142", route: str = "astana_karaganda"):
        self.locomotive_id = locomotive_id
        fallback = next(iter(ROUTES.values()))
        self.route_data = ROUTES.get(route, fallback)
        self.total_km = self.route_data["total_km"]

        self.speed = 60.0
        self.distance_km = 0.0

        self.water_temp_in = 82.0
        self.water_temp_out = 87.0
        self.oil_temp_in = 76.0
        self.oil_temp_out = 79.0
        self.air_temp_coll = 420.0
        self.fuel_temp = 32.0

        self.water_press = 245.0
        self.oil_press = 480.0
        self.air_press = 210.0
        self.air_consumption = 2400.0

        self.main_res_press = 8.8
        self.brake_press = 5.0
        self.compressor = False

        self.traction_current = 520.0
        self.traction_effort = 280.0
        self.gen_voltage = 850.0
        self.gen_current = 1800.0
        self.ground_fault_power = False
        self.ground_fault_aux = False
        self.wheel_slip = False

        self.fuel_level = 85.0
        self.fuel_consumption_rate = 180.0

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

    def tick(self, dt: float = 1.0) -> TelemetryPacket:
        self.distance_km += self.speed / 3600 * dt
        if self.distance_km >= self.total_km:
            self.distance_km = self.distance_km % self.total_km

        speed_factor = self.speed / 80.0

        self.water_temp_in += (82 * speed_factor - self.water_temp_in) * 0.02 * dt
        self.water_temp_out += (87 * speed_factor - self.water_temp_out) * 0.02 * dt
        self.oil_temp_in += (76 * speed_factor - self.oil_temp_in) * 0.015 * dt
        self.oil_temp_out += (79 * speed_factor - self.oil_temp_out) * 0.015 * dt

        self.traction_current = max(0, 520 * speed_factor + random.gauss(0, 15))
        self.traction_effort = max(0, 280 * speed_factor + random.gauss(0, 10))
        self.gen_voltage = 850 + random.gauss(0, 20)
        self.gen_current = 1800 * speed_factor + random.gauss(0, 50)

        self.fuel_consumption_rate = max(30, 180 * speed_factor + random.gauss(0, 5))
        self.fuel_level = max(0, self.fuel_level - self.fuel_consumption_rate / 3600 * dt * 0.01)

        self.main_res_press += random.gauss(-0.002, 0.005) * dt
        if self.main_res_press < 7.5:
            self.compressor = True
        if self.main_res_press > 9.5:
            self.compressor = False
        if self.compressor:
            self.main_res_press += 0.05 * dt

        self.main_res_press = max(5.0, min(10.5, self.main_res_press))
        self.brake_press = 5.0 + random.gauss(0, 0.05)

        lat, lon = self._interpolate_position()

        return TelemetryPacket(
            locomotive_id=self.locomotive_id,
            timestamp=datetime.now(timezone.utc),
            lat=round(lat, 6),
            lon=round(lon, 6),
            speed_kmh=round(self._noise(self.speed, 0.01), 1),
            wheel_slip=self.wheel_slip,
            water_temp_inlet=round(self._noise(self.water_temp_in), 1),
            water_temp_outlet=round(self._noise(self.water_temp_out), 1),
            oil_temp_inlet=round(self._noise(self.oil_temp_in), 1),
            oil_temp_outlet=round(self._noise(self.oil_temp_out), 1),
            air_temp_collector=round(self._noise(self.air_temp_coll), 1),
            fuel_temp=round(self._noise(self.fuel_temp), 1),
            water_pressure_kpa=round(self._noise(self.water_press), 0),
            oil_pressure_kpa=round(self._noise(self.oil_press), 0),
            air_pressure_kpa=round(self._noise(self.air_press), 0),
            air_consumption=round(self._noise(self.air_consumption), 0),
            main_reservoir_pressure=round(self.main_res_press, 2),
            brake_line_pressure=round(self.brake_press, 2),
            compressor_active=self.compressor,
            traction_current=round(self.traction_current, 1),
            traction_effort=round(self.traction_effort, 1),
            ground_fault_power=self.ground_fault_power,
            ground_fault_aux=self.ground_fault_aux,
            generator_voltage=round(self.gen_voltage, 1),
            generator_current=round(self.gen_current, 1),
            fuel_level=round(self.fuel_level, 1),
            fuel_consumption=round(self.fuel_consumption_rate, 1),
        )

    def apply_scenario(self, scenario: str, progress: float):
        """Apply a scenario effect. progress 0.0 -> 1.0."""
        if scenario == "overheat_water":
            target = 71 + progress * 50  # 71 -> 121
            self.water_temp_out += (target - self.water_temp_out) * 0.1
            self.water_temp_in += (target * 0.95 - self.water_temp_in) * 0.1
        elif scenario == "overheat_oil":
            target = 72 + progress * 28  # 72 -> 100
            self.oil_temp_out += (target - self.oil_temp_out) * 0.1
            self.oil_temp_in += (target * 0.95 - self.oil_temp_in) * 0.1
        elif scenario == "air_leak":
            self.main_res_press -= 0.08 * progress
        elif scenario == "ground_fault":
            if progress > 0.5:
                self.ground_fault_power = True
        elif scenario == "cascade":
            if progress < 0.3:
                self.oil_temp_out += (100 - self.oil_temp_out) * 0.05
            elif progress < 0.6:
                self.water_temp_out += (120 - self.water_temp_out) * 0.05
            else:
                self.ground_fault_power = True
                self.speed = max(0, self.speed - 2)
