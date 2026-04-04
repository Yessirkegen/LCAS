"""Seed data from real TE33A driver interview — thresholds, weights, penalties, users."""

import hashlib
import secrets

THRESHOLDS = [
    {"param_id": "water_temp_inlet", "unit": "°C", "crit_min": 40, "warn_min": 60, "norm_min": 71, "norm_max": 91, "warn_max": 100, "crit_max": 115},
    {"param_id": "water_temp_outlet", "unit": "°C", "crit_min": 40, "warn_min": 60, "norm_min": 71, "norm_max": 91, "warn_max": 100, "crit_max": 115},
    {"param_id": "oil_temp_inlet", "unit": "°C", "crit_min": 30, "warn_min": 60, "norm_min": 72, "norm_max": 85, "warn_max": 90, "crit_max": 96},
    {"param_id": "oil_temp_outlet", "unit": "°C", "crit_min": 30, "warn_min": 60, "norm_min": 72, "norm_max": 85, "warn_max": 90, "crit_max": 96},
    {"param_id": "air_temp_collector", "unit": "°C", "crit_min": 0, "warn_min": 30, "norm_min": 43, "norm_max": 600, "warn_max": 630, "crit_max": 650},
    {"param_id": "fuel_temp", "unit": "°C", "crit_min": -20, "warn_min": 0, "norm_min": 10, "norm_max": 50, "warn_max": 55, "crit_max": 65},
    {"param_id": "water_pressure_kpa", "unit": "кПа", "crit_min": 0, "warn_min": 15, "norm_min": 28, "norm_max": 365, "warn_max": 400, "crit_max": 450},
    {"param_id": "oil_pressure_kpa", "unit": "кПа", "crit_min": 0, "warn_min": 100, "norm_min": 179, "norm_max": 765, "warn_max": 800, "crit_max": 900},
    {"param_id": "air_pressure_kpa", "unit": "кПа", "crit_min": 0, "warn_min": 50, "norm_min": 90, "norm_max": 375, "warn_max": 400, "crit_max": 450},
    {"param_id": "air_consumption", "unit": "ед.", "crit_min": 1000, "warn_min": 1400, "norm_min": 1500, "norm_max": 3200, "warn_max": 3300, "crit_max": 3500},
    {"param_id": "main_reservoir_pressure", "unit": "кгс/см²", "crit_min": 6.5, "warn_min": 7.0, "norm_min": 7.5, "norm_max": 9.5, "warn_max": 10.0, "crit_max": 10.5},
    {"param_id": "brake_line_pressure", "unit": "кгс/см²", "crit_min": 3.8, "warn_min": 4.2, "norm_min": 4.8, "norm_max": 5.5, "warn_max": 5.8, "crit_max": 6.0},
    {"param_id": "traction_current", "unit": "А", "crit_min": -10, "warn_min": 0, "norm_min": 0, "norm_max": 800, "warn_max": 900, "crit_max": 1000},
    {"param_id": "fuel_level", "unit": "%", "crit_min": -1, "warn_min": 5, "norm_min": 10, "norm_max": 100, "warn_max": 101, "crit_max": 102},
    {"param_id": "speed_kmh", "unit": "км/ч", "crit_min": -1, "warn_min": 0, "norm_min": 0, "norm_max": 100, "warn_max": 110, "crit_max": 120},
]

WEIGHTS = [
    {"param_id": "water_temp_inlet", "weight": 0.10},
    {"param_id": "water_temp_outlet", "weight": 0.10},
    {"param_id": "oil_temp_inlet", "weight": 0.08},
    {"param_id": "oil_temp_outlet", "weight": 0.08},
    {"param_id": "air_temp_collector", "weight": 0.03},
    {"param_id": "fuel_temp", "weight": 0.02},
    {"param_id": "water_pressure_kpa", "weight": 0.06},
    {"param_id": "oil_pressure_kpa", "weight": 0.08},
    {"param_id": "air_consumption", "weight": 0.08},
    {"param_id": "air_pressure_kpa", "weight": 0.04},
    {"param_id": "main_reservoir_pressure", "weight": 0.08},
    {"param_id": "brake_line_pressure", "weight": 0.08},
    {"param_id": "traction_current", "weight": 0.05},
    {"param_id": "fuel_level", "weight": 0.05},
    {"param_id": "speed_kmh", "weight": 0.07},
]

PENALTIES = [
    {"event_id": "ground_fault_power", "penalty": -30},
    {"event_id": "ground_fault_aux", "penalty": -20},
    {"event_id": "wheel_slip", "penalty": -10},
]

USERS = [
    {"username": "driver", "password": "driver123", "role": "driver"},
    {"username": "dispatcher", "password": "dispatcher123", "role": "dispatcher"},
    {"username": "admin", "password": "admin123", "role": "admin"},
    {"username": "simulator", "password": "sim123", "role": "simulator"},
]


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode()).hexdigest()
    return f"{salt}${h}"


def verify_password(password: str, password_hash: str) -> bool:
    salt, h = password_hash.split("$", 1)
    return hashlib.sha256((salt + password).encode()).hexdigest() == h


def get_users_with_hashed_passwords():
    return [
        {
            "username": u["username"],
            "password_hash": hash_password(u["password"]),
            "role": u["role"],
        }
        for u in USERS
    ]
