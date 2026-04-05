# LCAS — Locomotive Crew Alerting System

Система мониторинга и оповещения экипажа локомотива в реальном времени. Поддерживает **1700+ локомотивов** одновременно с микросервисной архитектурой.

## Быстрый старт (1 команда)

```bash
git clone https://github.com/Yessirkegen/LCAS.git
cd LCAS
make dev
```

Дождитесь запуска (~60 сек), затем откройте:

| Ресурс | URL |
|--------|-----|
| **Фронтенд** | http://localhost:3001 |
| **API** | http://localhost:8000/health |
| **Swagger** | http://localhost:8000/docs |

### Учётные данные

| Роль | Логин | Пароль |
|------|-------|--------|
| Машинист | `driver` | `driver123` |
| Диспетчер | `dispatcher` | `dispatcher123` |
| Админ | `admin` | `admin123` |

### Запуск симулятора

После входа запустите симулятор через API:

```bash
# 1 локомотив (для тестирования)
curl -X POST "http://localhost:8000/simulator/start"

# 10 локомотивов
curl -X POST "http://localhost:8000/simulator/start?count=10&hz=1"

# 1700 локомотивов (полная нагрузка)
curl -X POST "http://localhost:8000/simulator/start?count=1700&hz=1"

# Электровоз KZ8A
curl -X POST "http://localhost:8000/simulator/start?count=5&hz=1&loco_type=KZ8A"

# Аварийный сценарий (каскад: масло → вода → замыкание)
curl -X POST "http://localhost:8000/simulator/scenario?locomotive_id=TE33A-0001&scenario=cascade&duration_seconds=60"
```

## Требования

- **Docker** и **Docker Compose** v2
- **Порты**: 3001 (frontend), 8000 (nginx/api), 5433 (postgres), 6380 (redis), 9092 (kafka)

## Архитектура

```
                    ┌──────────────────────────────────────────┐
                    │              Nginx (LB :8000)            │
                    └──┬──────┬──────┬──────┬─────────────────┘
                       │      │      │      │
              ┌────────┘  ┌───┘  ┌───┘  ┌───┘
              ▼           ▼      ▼      ▼
        ┌──────────┐ ┌────────┐ ┌────┐ ┌──────────┐
        │Ingestion │ │  API   │ │ WS │ │Simulator │
        │   x3     │ │  x3   │ │ x4 │ │   x1     │
        └────┬─────┘ └───┬────┘ └─┬──┘ └────┬─────┘
             │            │       │          │
             ▼            │       │          │
     ┌───────────────┐    │       │          │
     │ Kafka (16 pt) │◄───┼───────┼──────────┘
     └───────┬───────┘    │       │
             │            │       │
             ▼            │       ▼
     ┌───────────────┐    │  ┌─────────┐
     │ Processor x8  │────┼─►│  Redis  │
     │ (HI, alerts)  │    │  └─────────┘
     └───────┬───────┘    │
             │            │
             ▼            ▼
     ┌───────────────────────┐
     │  TimescaleDB (Postgres)│
     └───────────────────────┘
```

**25 контейнеров** в production:

| Сервис | Инстансов | Назначение |
|--------|:---------:|------------|
| svc-ingestion | 3 | HTTP-приём телеметрии → Kafka |
| svc-processor | 8 | Kafka consumer: HI, алерты, аномалии → Redis + DB |
| svc-api | 3 | REST API: флот, история, admin |
| svc-ws-gateway | 4 | WebSocket: реалтайм через Redis pub/sub |
| svc-simulator | 1 | Генерация телеметрии 1700 лок → Kafka |
| nginx | 1 | Reverse proxy, load balancing |
| kafka | 1 | 16 партиций, consumer group |
| redis | 1 | Состояние, pub/sub, rate limiting |
| postgres | 1 | TimescaleDB, гипертаблицы |
| frontend | 1 | React, Vite, MapLibre, ECharts, Three.js |

## Ключевые функции

### Кабина машиниста
- **Health Index** (0–100) — взвешенная оценка по всем параметрам
- **LCAS-оповещения** — CAUTION / WARNING / голосовое TTS / полноэкранный оверлей
- **Тренды** — ECharts графики параметров в реальном времени
- **3D-модель** — визуализация локомотива (TE33A / KZ8A)
- **Горячие клавиши**: Пробел (подтвердить алерт), D (тема), M (звук)

### Диспетчерская
- **Карта** — 1700 точек на MapLibre (GPU-рендеринг)
- **Heatmap** — визуализация флота одним взглядом (Canvas)
- **Фильтрация** — по статусу, поиск по номеру

### Два типа тяги
- **TE33A** — дизельный (температуры воды/масла, давления, генератор)
- **KZ8A** — электровоз 25 кВ (пантограф, ТЭД, инвертор, рекуперация)

### Аварийные сценарии
```bash
# Перегрев воды
curl -X POST ".../simulator/scenario?scenario=overheat_water&duration_seconds=30"
# Перегрев масла
curl -X POST ".../simulator/scenario?scenario=overheat_oil&duration_seconds=30"
# Замыкание на землю
curl -X POST ".../simulator/scenario?scenario=ground_fault&duration_seconds=30"
# Каскадный отказ
curl -X POST ".../simulator/scenario?scenario=cascade&duration_seconds=60"
```

## Makefile

```bash
make dev              # Запустить всё
make down             # Остановить
make logs             # Все логи
make logs-processor   # Логи процессоров
make logs-simulator   # Логи симулятора
make ps               # Статус контейнеров
make clean            # Удалить всё включая данные
```

## Стек технологий

**Backend**: Python 3.12, FastAPI, aiokafka, SQLAlchemy, asyncpg, redis.asyncio, pydantic

**Frontend**: React 19, TypeScript, Vite, Zustand, MapLibre GL, ECharts, Three.js / R3F, i18next

**Инфраструктура**: Docker Compose, Nginx, Kafka, Redis, TimescaleDB/PostgreSQL

## API

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | Авторизация |
| GET | `/api/locomotives` | Список флота |
| GET | `/api/locomotives/{id}/state` | Текущее состояние |
| GET | `/api/locomotives/{id}/telemetry?minutes=5` | История телеметрии |
| GET | `/api/admin/thresholds` | Пороговые значения |
| GET | `/api/admin/system-status` | Статус системы |
| POST | `/simulator/start?count=N&loco_type=TE33A` | Запуск симулятора |
| POST | `/simulator/scenario?scenario=cascade` | Аварийный сценарий |
| WS | `/ws?token=JWT&loco_id=ID` | WebSocket телеметрия |

## Демо

**Live**: https://13-60-234-204.sslip.io

## Лицензия

MIT
