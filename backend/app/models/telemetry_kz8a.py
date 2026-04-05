"""KZ8A electric locomotive telemetry model — different from diesel TE33A."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class KZ8ATelemetryPacket(BaseModel):
    locomotive_id: str
    locomotive_type: str = "KZ8A"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    lat: Optional[float] = None
    lon: Optional[float] = None

    speed_kmh: Optional[float] = None
    wheel_slip: Optional[bool] = None

    # Electric traction (no diesel!)
    catenary_voltage: Optional[float] = None       # Напряжение контактной сети (25000 В номинал)
    pantograph_current: Optional[float] = None     # Ток пантографа (А)
    pantograph_up: Optional[bool] = True

    # Transformer
    transformer_primary_v: Optional[float] = None  # Напряжение первичной обмотки
    transformer_secondary_v: Optional[float] = None
    transformer_oil_temp: Optional[float] = None   # Темп масла трансформатора (°C)

    # Traction inverters
    inverter_current: Optional[float] = None       # Ток инвертора (А)
    inverter_temp: Optional[float] = None          # Темп IGBT модулей

    # 8 TED (4 per section, async motors)
    ted_avg_current: Optional[float] = None
    ted_avg_temp: Optional[float] = None
    ted_max_temp: Optional[float] = None

    # Regenerative braking
    regen_active: Optional[bool] = None
    regen_power_kw: Optional[float] = None

    # Pneumatics (same as TE33A)
    main_reservoir_pressure: Optional[float] = None
    brake_line_pressure: Optional[float] = None
    compressor_active: Optional[bool] = None

    # Cooling
    cooling_fan_rpm: Optional[float] = None
    cooling_water_temp: Optional[float] = None

    # Safety
    ground_fault: Optional[bool] = None
    fire_alarm: Optional[bool] = None

    # Inter-section
    section2_connected: Optional[bool] = True
    section2_ted_temp: Optional[float] = None
