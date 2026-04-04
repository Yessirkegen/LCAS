# Индекс здоровья локомотива

## Формула

```
HI = Σ (wᵢ × scoreᵢ) - penalties
```

Где:
- `HI` — Health Index, итоговое значение 0–100
- `wᵢ` — вес параметра i (сумма всех весов = 1.0)
- `scoreᵢ` — нормализованная оценка параметра i (0–100)
- `penalties` — штрафы за бинарные алерты

## Нормализация параметра (score)

Каждый числовой параметр нормализуется в шкалу 0–100:

```
                    100 ─┐         ┌─────────────┐         ┌─ 100
                         │         │             │         │
score                    │         │   НОРМА     │         │
                         │    W    │   score=100 │    W    │
                    50 ─┤  A   ─┤             ├─   A  ├─ 50
                         │  R     │             │    R    │
                         │  N     │             │    N    │
                     0 ─┤  I   ─┤             ├─   I  ├─ 0
                         │  N     │             │    N    │
                         │  G     │             │    G    │
                         │         │             │         │
                    crit_low  warn_low   warn_high  crit_high
```

```python
def calculate_score(value, norm_min, norm_max, warn_min, warn_max, crit_min, crit_max):
    if norm_min <= value <= norm_max:
        return 100.0

    if warn_min <= value < norm_min:
        return 50.0 + 50.0 * (value - warn_min) / (norm_min - warn_min)

    if norm_max < value <= warn_max:
        return 50.0 + 50.0 * (warn_max - value) / (warn_max - norm_max)

    if crit_min <= value < warn_min:
        return 50.0 * (value - crit_min) / (warn_min - crit_min)

    if warn_max < value <= crit_max:
        return 50.0 * (crit_max - value) / (crit_max - warn_max)

    return 0.0  # за пределами критических
```

## Веса параметров

| Группа | Параметр | Вес | Обоснование |
|---|---|---|---|
| **Температуры** | water_temp_inlet | 0.10 | Норма 71–91°C, снятие нагрузки >115°C |
| | water_temp_outlet | 0.10 | Норма 71–91°C, снятие нагрузки >115°C |
| | oil_temp_inlet | 0.08 | Норма 72–85°C, снятие нагрузки >96°C |
| | oil_temp_outlet | 0.08 | Норма 72–85°C, снятие нагрузки >96°C |
| | air_temp_collector | 0.03 | Норма 43–600°C (выхлоп/турбина) |
| | fuel_temp | 0.02 | Влияет на вязкость |
| **Давления** | water_pressure | 0.06 | Норма 28–365 кПа |
| | oil_pressure | 0.08 | Норма 179–765 кПа |
| | air_consumption | 0.08 | Снятие нагрузки вне 1500–3200 |
| | air_pressure_collector | 0.04 | Норма 90–375 кПа |
| **Пневматика** | main_reservoir_pressure | 0.08 | Компрессор вкл 7.5 / выкл 9.5 кгс/см² |
| | brake_line_pressure | 0.08 | Безопасность торможения |
| **Электрика** | traction_current | 0.05 | Нагрузка ТЭД |
| | generator_voltage | 0.03 | Электросистема |
| **Топливо** | fuel_level | 0.05 | Запас хода |
| | fuel_consumption | 0.02 | Эффективность |
| | | **Σ = 0.98** | +0.02 резерв для будущих |

## Штрафы (penalties)

Бинарные события, которые мгновенно снижают HI:

| Событие | Штраф | Причина |
|---|---|---|
| `ground_fault_power = true` | -30 | Пробой изоляции силовых цепей |
| `ground_fault_aux = true` | -20 | Пробой изоляции вспомогательных |
| `wheel_slip = true` | -10 | Боксование/юз |

## Категории

| Категория | Диапазон HI | Цвет | Действие |
|---|---|---|---|
| **Норма** | 80–100 | Зелёный | Штатная эксплуатация |
| **Внимание** | 50–79 | Жёлтый | Усиленный мониторинг, подготовка к снижению нагрузки |
| **Критично** | 0–49 | Красный | Снятие нагрузки, остановка, вызов ремонтной бригады |

Для буквенной шкалы (A–E):
| Буква | Диапазон | Соответствие |
|---|---|---|
| A | 90–100 | Отлично |
| B | 80–89 | Хорошо (нижняя граница нормы) |
| C | 60–79 | Внимание |
| D | 40–59 | Плохо |
| E | 0–39 | Критично |

## Объяснимость (top-5 факторов)

При отображении HI пользователю показываются 5 параметров с наибольшим негативным вкладом:

```python
def get_top_factors(params, scores, weights):
    impacts = []
    for param_id, score in scores.items():
        loss = weights[param_id] * (100.0 - score)
        if loss > 0:
            impacts.append({
                "param": param_id,
                "value": params[param_id],
                "score": score,
                "weight": weights[param_id],
                "impact": round(loss, 1),
            })
    return sorted(impacts, key=lambda x: x["impact"], reverse=True)[:5]
```

Пример вывода:

```json
{
  "health_index": 62,
  "category": "attention",
  "letter": "C",
  "top_factors": [
    {"param": "water_temp_outlet", "value": 98.5, "score": 45, "weight": 0.10, "impact": 5.5},
    {"param": "oil_temp_outlet", "value": 91.2, "score": 52, "weight": 0.08, "impact": 3.8},
    {"param": "brake_line_pressure", "value": 4.6, "score": 60, "weight": 0.08, "impact": 3.2},
    {"param": "oil_pressure", "value": 1.7, "score": 65, "weight": 0.08, "impact": 2.8},
    {"param": "fuel_level", "value": 18.0, "score": 70, "weight": 0.05, "impact": 1.5}
  ],
  "penalties_applied": [
    {"event": "wheel_slip", "penalty": -10}
  ]
}
```

## Конфигурация (без перекомпиляции)

Все пороги и веса хранятся в таблицах PostgreSQL:

```sql
CREATE TABLE thresholds_config (
    param_id       TEXT PRIMARY KEY,
    norm_min       FLOAT,
    norm_max       FLOAT,
    warn_min       FLOAT,
    warn_max       FLOAT,
    crit_min       FLOAT,
    crit_max       FLOAT,
    updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE weights_config (
    param_id    TEXT PRIMARY KEY,
    weight      FLOAT NOT NULL CHECK (weight >= 0 AND weight <= 1),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE penalties_config (
    event_id    TEXT PRIMARY KEY,
    penalty     FLOAT NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now()
);
```

Админ меняет через REST API → записывается в БД → Processor при следующем цикле подхватывает (кэш в Redis, TTL 10 сек).

## Сглаживание (EMA)

Перед расчётом score сырые значения сглаживаются экспоненциальной скользящей средней:

```python
def ema(current_value, previous_ema, alpha=0.3):
    return alpha * current_value + (1 - alpha) * previous_ema
```

`alpha = 0.3` — баланс между отзывчивостью и фильтрацией шумов.
