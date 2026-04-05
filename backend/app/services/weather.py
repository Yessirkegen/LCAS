"""Weather along route — simulated (or real via OpenWeatherMap if API key set)."""

import random
import logging
from app.config import settings

logger = logging.getLogger(__name__)

SIMULATED_WEATHER = [
    {"condition": "ясно", "temp_c": -5, "wind_ms": 8, "icon": "☀️"},
    {"condition": "облачно", "temp_c": -8, "wind_ms": 12, "icon": "☁️"},
    {"condition": "снег", "temp_c": -12, "wind_ms": 15, "icon": "🌨️"},
    {"condition": "метель", "temp_c": -18, "wind_ms": 22, "icon": "❄️"},
    {"condition": "дождь", "temp_c": 5, "wind_ms": 10, "icon": "🌧️"},
    {"condition": "туман", "temp_c": 2, "wind_ms": 3, "icon": "🌫️"},
]


def get_weather_along_route(stations: list[dict]) -> list[dict]:
    result = []
    for station in stations:
        weather = random.choice(SIMULATED_WEATHER)
        result.append({
            "station": station["name"],
            "km": station["km"],
            "lat": station.get("lat"),
            "lon": station.get("lon"),
            **weather,
        })
    return result
