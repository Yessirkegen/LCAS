ч# Архитектура системы

## Общая схема

```
┌─── БОРТ ЛОКОМОТИВА (автономно) ──────────────────────────┐
│                                                           │
│  Датчики ──► Edge Processor ──► Дашборд машиниста        │
│              (бортовой ПК)      (localhost, всегда)       │
│              HI + алерты +      LCAS голос (локально)    │
│              SQLite буфер                                 │
│                    │                                      │
│                    │ sync (при наличии сети)              │
└────────────────────┼──────────────────────────────────────┘
                     │  × 1700 локомотивов
                     │  1 700 RPS (пик x10 = 17 000 RPS)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     K3s CLUSTER                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  INGRESS (Traefik)                                    │   │
│  │  TLS termination, WebSocket, routing                  │   │
│  └───────────┬──────────────┬───────────────┬───────────┘   │
│              │              │               │                │
│    /ingest   │    /ws       │    /api       │    /           │
│              ▼              ▼               ▼                ▼
│  ┌───────────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────┐
│  │  Ingestion    │ │  WS Hub      │ │  REST API  │ │ Frontend │
│  │  Service      │ │              │ │            │ │ React    │
│  │  2–10 pods    │ │  2–8 pods    │ │  2–6 pods  │ │ 2 pods   │
│  │  HPA ⟳       │ │  HPA ⟳      │ │  HPA ⟳    │ │          │
│  └───────┬───────┘ └──────▲───────┘ └─────▲──────┘ └──────────┘
│          │                │               │                │
│          ▼                │               │                │
│  ┌───────────────┐        │               │                │
│  │  Apache Kafka │        │               │                │
│  │  (Strimzi)    │        │               │                │
│  │  3 брокера    │        │               │                │
│  │  12 партиций  │        │               │                │
│  └───────┬───────┘        │               │                │
│          │                │               │                │
│          ▼                │               │                │
│  ┌───────────────┐        │               │                │
│  │  Processor    │        │               │                │
│  │  2–10 pods    │────────┘               │                │
│  │  HPA ⟳       │                        │                │
│  │               │                        │                │
│  │  • Normalizer │                        │                │
│  │  • HI Calc    │                        │                │
│  │  • Alert Det  │                        │                │
│  └───┬───────┬───┘                        │                │
│      │       │                            │                │
│      ▼       ▼                            │                │
│  ┌────────┐ ┌───────────────────┐         │                │
│  │ Redis  │ │ PostgreSQL        │─────────┘                │
│  │        │ │ + TimescaleDB     │                          │
│  │ current│ │ primary + replica │                          │
│  │ state  │ │ 72h retention     │                          │
│  │ pub/sub│ │                   │                          │
│  └────────┘ └───────────────────┘                          │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Monitoring: Prometheus + Grafana + Alertmanager      │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Компоненты

### Ingestion Service
- **Назначение:** Приём телеметрии от локомотивов
- **Протокол входа:** gRPC / WebSocket / MQTT
- **Действия:** Валидация схемы, дедубликация (по locomotive_id + timestamp), сериализация в Kafka
- **Stateless:** Да — горизонтально масштабируется через HPA
- **Kafka topic:** `raw-telemetry` (key = locomotive_id, partition = locomotive_id % 12)

### Apache Kafka (Strimzi)
- **Роль:** Шина событий, буфер пиков нагрузки
- **Топики:**
  - `raw-telemetry` — сырые данные с локомотивов (12 партиций, retention 72ч)
  - `processed-telemetry` — нормализованные данные с Health Index
  - `alerts` — сгенерированные алерты
- **Гарантии:** At-least-once delivery, ordering per locomotive (same partition)

### Processor
- **Назначение:** Потоковая обработка телеметрии
- **Подкомпоненты:**
  - **Normalizer:** EMA-сглаживание шумов, приведение единиц, валидация диапазонов
  - **Health Index Calculator:** Расчёт HI по формуле с весами, определение top-5 факторов
  - **Alert Detector:** Проверка порогов, генерация алертов в Kafka topic `alerts`
  - **DB Writer:** Батчевая запись в PostgreSQL (batch по 100 записей)
- **Stateless:** Да — каждый pod обрабатывает свой набор партиций Kafka (consumer group)
- **Выход:** Redis publish (для WS Hub) + PostgreSQL insert

### Redis
- **Current state:** `locomotive:{id}:state` — последний пакет (TTL 30s)
- **Health Index:** `locomotive:{id}:health` — текущий HI (TTL 30s)
- **Alerts:** `locomotive:{id}:alerts` — активные алерты
- **Pub/Sub:** `channel:loco:{id}` — канал для рассылки через WS Hub
- **Список локомотивов:** `locomotives:active` — sorted set для диспетчера

### PostgreSQL + TimescaleDB
- **Hypertable:** `telemetry` — партиционирование по времени (чанки 1 час)
- **Compression:** Автоматическая для данных старше 1 часа (10–20x)
- **Retention policy:** Автоудаление чанков старше 72 часов
- **Read replica:** Для REST API запросов (история, отчёты) — не нагружает primary
- **Таблицы:**
  - `telemetry` — hypertable, все параметры
  - `alerts_history` — лог алертов
  - `health_index_history` — история HI
  - `thresholds_config` — конфигурация порогов (admin)
  - `weights_config` — веса индекса (admin)
  - `users` — пользователи и роли

### WS Hub
- **Назначение:** Доставка реалтайм-данных клиентам по WebSocket
- **Механизм:** Подписка на Redis pub/sub по locomotive_id
- **Подключение клиента:** `ws://host/ws?token=JWT&loco_id=123`
- **Авторизация:** JWT с ролью — driver видит 1 лок, dispatcher видит все
- **Stateless:** Да — каждый pod держит свои WebSocket-соединения, получает данные из Redis

### REST API
- **Назначение:** Исторические данные, конфигурация, отчёты
- **Эндпоинты:**
  - `GET /api/locomotives` — список с текущим статусом
  - `GET /api/locomotives/{id}/telemetry?from=&to=` — история
  - `GET /api/locomotives/{id}/health/history` — история HI
  - `GET /api/locomotives/{id}/alerts` — алерты
  - `POST /api/reports/export` — генерация PDF/CSV
  - `GET/PUT /api/admin/thresholds` — конфигурация порогов
  - `GET/PUT /api/admin/weights` — конфигурация весов
  - `GET /api/health` — health-check
- **Документация:** Swagger/OpenAPI автогенерация (FastAPI)

### Frontend (React)
- **SPA** с видами: Cabin, Dispatch, Admin, Simulator
- **LCAS** — Locomotive Crew Alerting System (встроен в Cabin):
  - Web Speech API — голосовые алерты на русском
  - Web Audio API — звуковые тоны (WARNING/CAUTION/ADVISORY)
  - Приоритетная очередь алертов (авиационный подход EICAS/ECAM)
  - Master Warning / Master Caution кнопки
  - Предиктивный HI — пунктирная линия прогноза на графике
- **WebSocket клиент** с auto-reconnect и exponential backoff
- **Графики:** ECharts / Recharts с авто-скейлингом и zoom
- **Карта:** MapLibre (диспетчер, 1700 точек) / Leaflet (кабина, симулятор)
- **Темы:** светлая / тёмная
- **Адаптивность:** 24" панель + ноутбук
- **i18n:** русский / казахский / английский

### Simulator Control Panel
- **Назначение:** Управление виртуальным тепловозом для демо и тестирования
- **Интерфейс:** Слайдеры с цветовыми зонами, toggle-кнопки, карта маршрута
- **Режимы:** Ручной / Авто (шум ±2%) / Сценарий (7 готовых)
- **Highload:** Генерация 1–1700 виртуальных локомотивов
- **Интеграция:** POST /ingest/telemetry — тот же endpoint, тот же формат
- **Маршруты:** Астана–Караганда, Алматы–Шу, Кольцевой (демо)
- **Корреляция:** Скорость ↔ расход ↔ температуры ↔ тяга (реалистичные связи)

## Потоки данных

### Realtime (< 500 мс end-to-end)
```
Локомотив/Симулятор → Ingestion → Kafka → Processor → Redis pub/sub → WS Hub → Клиент
                                              ↓                          ↓
                                         PostgreSQL              LCAS (голос + тон)
                                      (async batch write)
```

### Исторические запросы
```
Клиент → REST API → PostgreSQL (read replica) → Клиент
```

### Конфигурация (админ)
```
Админ → REST API → PostgreSQL (thresholds_config / weights_config)
                → Redis (invalidate cache)
                → Processor (подхватывает новые пороги)
```

### Симулятор
```
Simulator Panel → POST /ingest/telemetry → Ingestion Service
                   (тот же JSON-формат, бэкенд не различает источник)
```

### Нотификации
```
Processor (алерт) → Telegram Bot API → Telegram-канал диспетчера
```

## Сетевая схема (K3s)

```
Namespace: locomotive
  Services: ingestion, processor, ws-hub, rest-api, frontend

Namespace: infra
  Services: kafka (Strimzi), postgres (CloudNativePG), redis

Namespace: monitoring
  Services: prometheus, grafana, alertmanager

Network Policies:
  locomotive → infra: разрешено (kafka, postgres, redis)
  infra → infra: разрешено (репликация)
  monitoring → всё: разрешено (scrape метрик)
  internet → ingress: разрешено (Traefik)
```
