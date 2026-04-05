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

    catenary_voltage: Optional[float] = None
    pantograph_current: Optional[float] = None
    pantograph_up: Optional[bool] = True

    transformer_primary_v: Optional[float] = None
    transformer_secondary_v: Optional[float] = None
    transformer_oil_temp: Optional[float] = None

    inverter_current: Optional[float] = None
    inverter_temp: Optional[float] = None

    ted_avg_current: Optional[float] = None
    ted_avg_temp: Optional[float] = None
    ted_max_temp: Optional[float] = None

    regen_active: Optional[bool] = None
    regen_power_kw: Optional[float] = None

    main_reservoir_pressure: Optional[float] = None
    brake_line_pressure: Optional[float] = None
    compressor_active: Optional[bool] = None

    cooling_fan_rpm: Optional[float] = None
    cooling_water_temp: Optional[float] = None

    ground_fault: Optional[bool] = None
    fire_alarm: Optional[bool] = None

    section2_connected: Optional[bool] = True
    section2_ted_temp: Optional[float] = None
