from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TelemetryPacket(BaseModel):
    locomotive_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    lat: Optional[float] = None
    lon: Optional[float] = None

    speed_kmh: Optional[float] = None
    wheel_slip: Optional[bool] = None

    water_temp_inlet: Optional[float] = None
    water_temp_outlet: Optional[float] = None
    oil_temp_inlet: Optional[float] = None
    oil_temp_outlet: Optional[float] = None
    air_temp_collector: Optional[float] = None
    fuel_temp: Optional[float] = None

    water_pressure_kpa: Optional[float] = None
    oil_pressure_kpa: Optional[float] = None
    air_pressure_kpa: Optional[float] = None
    air_consumption: Optional[float] = None

    main_reservoir_pressure: Optional[float] = None
    brake_line_pressure: Optional[float] = None
    compressor_active: Optional[bool] = None

    traction_current: Optional[float] = None
    traction_effort: Optional[float] = None
    ground_fault_power: Optional[bool] = None
    ground_fault_aux: Optional[bool] = None
    generator_voltage: Optional[float] = None
    generator_current: Optional[float] = None

    fuel_level: Optional[float] = None
    fuel_consumption: Optional[float] = None


class HealthIndexResult(BaseModel):
    locomotive_id: str
    timestamp: datetime
    value: float
    letter: str
    category: str
    top_factors: list[dict]
    penalties_applied: list[dict]
    predicted_minutes_to_critical: Optional[float] = None


class Alert(BaseModel):
    id: Optional[str] = None
    locomotive_id: str
    timestamp: datetime
    level: str
    param: str
    message: str
    voice_text: Optional[str] = None
    value: Optional[float] = None
    threshold: Optional[float] = None
    status: str = "active"
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
