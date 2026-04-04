from datetime import datetime

from sqlalchemy import (
    Column, String, Float, Boolean, DateTime, Text, Integer, func
)
from app.services.database import Base


class Telemetry(Base):
    __tablename__ = "telemetry"

    time = Column(DateTime(timezone=True), primary_key=True, default=func.now())
    locomotive_id = Column(String(32), primary_key=True)

    lat = Column(Float)
    lon = Column(Float)
    speed_kmh = Column(Float)
    wheel_slip = Column(Boolean)

    water_temp_inlet = Column(Float)
    water_temp_outlet = Column(Float)
    oil_temp_inlet = Column(Float)
    oil_temp_outlet = Column(Float)
    air_temp_collector = Column(Float)
    fuel_temp = Column(Float)

    water_pressure_kpa = Column(Float)
    oil_pressure_kpa = Column(Float)
    air_pressure_kpa = Column(Float)
    air_consumption = Column(Float)

    main_reservoir_pressure = Column(Float)
    brake_line_pressure = Column(Float)
    compressor_active = Column(Boolean)

    traction_current = Column(Float)
    traction_effort = Column(Float)
    ground_fault_power = Column(Boolean)
    ground_fault_aux = Column(Boolean)
    generator_voltage = Column(Float)
    generator_current = Column(Float)

    fuel_level = Column(Float)
    fuel_consumption = Column(Float)

    health_index = Column(Float)


class AlertHistory(Base):
    __tablename__ = "alerts_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    locomotive_id = Column(String(32), index=True)
    timestamp = Column(DateTime(timezone=True), default=func.now(), index=True)
    level = Column(String(16))
    param = Column(String(64))
    message = Column(Text)
    voice_text = Column(Text)
    value = Column(Float)
    threshold = Column(Float)
    status = Column(String(16), default="active")
    acknowledged_by = Column(String(64))
    resolved_at = Column(DateTime(timezone=True))


class HealthIndexHistory(Base):
    __tablename__ = "health_index_history"

    time = Column(DateTime(timezone=True), primary_key=True, default=func.now())
    locomotive_id = Column(String(32), primary_key=True)
    value = Column(Float)
    letter = Column(String(1))
    category = Column(String(16))
    top_factors = Column(Text)


class ThresholdConfig(Base):
    __tablename__ = "thresholds_config"

    param_id = Column(String(64), primary_key=True)
    unit = Column(String(16))
    norm_min = Column(Float)
    norm_max = Column(Float)
    warn_min = Column(Float)
    warn_max = Column(Float)
    crit_min = Column(Float)
    crit_max = Column(Float)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())


class WeightConfig(Base):
    __tablename__ = "weights_config"

    param_id = Column(String(64), primary_key=True)
    weight = Column(Float)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())


class PenaltyConfig(Base):
    __tablename__ = "penalties_config"

    event_id = Column(String(64), primary_key=True)
    penalty = Column(Float)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, index=True)
    password_hash = Column(String(256))
    role = Column(String(16))
    created_at = Column(DateTime(timezone=True), default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), default=func.now(), index=True)
    username = Column(String(64))
    action = Column(String(128))
    details = Column(Text)
