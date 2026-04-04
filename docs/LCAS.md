# LCAS — Locomotive Crew Alerting System

> Система алертов и оповещения локомотива, построенная по принципам
> авиационных систем EICAS/ECAM (Airbus/Boeing).

## Концепция

В авиации одновременно могут быть десятки проблем, но пилот слышит только самую
критичную, и в строгом порядке приоритета. Мы применяем тот же подход к ЖД-телеметрии.

### Аналогии с авиацией

| Авиация | LCAS (наш проект) | Суть |
|---|---|---|
| EICAS / ECAM | Дашборд "Кабина" | Показатели систем + алерты |
| GPWS "PULL UP!" | "СНЯТЬ НАГРУЗКУ" | Голосовой приоритетный алерт |
| Master Warning (красная) | Master Warning (красная) | Кнопка acknowledge WARNING |
| Master Caution (жёлтая) | Master Caution (жёлтая) | Кнопка acknowledge CAUTION |
| FDR (чёрный ящик) | PostgreSQL + TimescaleDB | Запись параметров для разбора |
| ATC Radar | Карта диспетчера | Все объекты на карте в реальном времени |
| ACARS | WebSocket поток | Телеметрия с борта в реальном времени |

## Три уровня алертов

| Уровень | Цвет | Звук | Голос | Повтор | Действие |
|---|---|---|---|---|---|
| **WARNING** | Красный, мигает | Тройной зуммер | Да, повтор каждые 5 сек | До acknowledge | Немедленное действие |
| **CAUTION** | Жёлтый | Одинарный гонг | Да, один раз | Нет | Усиленный контроль |
| **ADVISORY** | Голубой | Тихий тон | Нет | Нет | Принять к сведению |

## Голосовые сообщения

### WARNING (немедленное действие)

| Событие | Порог | Голос (русский) | Аналог в авиации |
|---|---|---|---|
| Темп воды > 115°C | critical | **"ТЕМПЕРАТУРА ВОДЫ КРИТИЧНА. СНЯТЬ НАГРУЗКУ"** | "ENGINE FIRE" |
| Темп масла > 96°C | critical | **"ТЕМПЕРАТУРА МАСЛА КРИТИЧНА. СНЯТЬ НАГРУЗКУ"** | "OIL OVERHEAT" |
| Земля сил. цепей | true | **"ЗАМЫКАНИЕ НА ЗЕМЛЮ. НАГРУЗКА СНЯТА"** | "FIRE" |
| Расход воздуха вне 1500–3200 | critical | **"ДАВЛЕНИЕ ВОЗДУХА. СНЯТЬ НАГРУЗКУ"** | "LOW PRESSURE" |
| Давление ГР < 7.0 кгс/см² | critical | **"ДАВЛЕНИЕ В ГЛАВНЫХ РЕЗЕРВУАРАХ"** | "LOW HYDRAULIC" |
| Топливо < 10% | critical | **"ТОПЛИВО КРИТИЧНО"** | "FUEL CRITICAL" |

### CAUTION (усиленный контроль)

| Событие | Порог | Голос (русский) | Аналог в авиации |
|---|---|---|---|
| Темп воды > 91°C | warning | **"ВНИМАНИЕ. ТЕМПЕРАТУРА ВОДЫ"** | "ENGINE OVERHEAT" |
| Темп масла > 85°C | warning | **"ВНИМАНИЕ. ТЕМПЕРАТУРА МАСЛА"** | "OIL TEMPERATURE" |
| Давление масла < 179 кПа | warning | **"ВНИМАНИЕ. ДАВЛЕНИЕ МАСЛА"** | "LOW OIL PRESSURE" |
| Топливо < 20% | warning | **"ВНИМАНИЕ. НИЗКИЙ УРОВЕНЬ ТОПЛИВА"** | "LOW FUEL" |
| Боксование | true | **"БОКСОВАНИЕ"** | "WINDSHEAR" |
| Скорость > ограничения | warning | **"ПРЕВЫШЕНИЕ СКОРОСТИ"** | "OVERSPEED" |
| Земля вспом. цепей | true | **"ВНИМАНИЕ. ЗАМЫКАНИЕ ВСПОМОГАТЕЛЬНЫХ ЦЕПЕЙ"** | "ELECTRICAL" |

### ADVISORY (информация)

| Событие | Визуально | Звук |
|---|---|---|
| Соединение потеряно | Красная полоска, мигание | Нет голоса |
| Параметр вернулся в норму | Зелёная пометка | Тихий позитивный тон |
| Компрессор включился | Иконка компрессора | Нет |

## Приоритетная очередь

### Правила

1. **WARNING прерывает всё** — если говорит CAUTION и приходит WARNING, речь прерывается, говорит WARNING
2. **Очередь по приоритету** — WARNING > CAUTION > ADVISORY
3. **Не спамит** — между сообщениями пауза 2 сек
4. **WARNING повторяется** — каждые 5 сек пока не нажмут Master Warning
5. **Подавление** — когда активен WARNING, ADVISORY молчит (только визуально)

### Пример множественных алертов

```
Ситуация: одновременно температура воды 116°C + земля в цепях + топливо 18%

Приоритетная очередь:
  1. [WARNING] "ЗАМЫКАНИЕ НА ЗЕМЛЮ. НАГРУЗКА СНЯТА"      ← говорит СЕЙЧАС
     (пауза 2 сек)
  2. [WARNING] "ТЕМПЕРАТУРА ВОДЫ КРИТИЧНА. СНЯТЬ НАГРУЗКУ" ← говорит СЛЕДУЮЩИМ
     (пауза 2 сек)
  3. [CAUTION] "ВНИМАНИЕ. НИЗКИЙ УРОВЕНЬ ТОПЛИВА"         ← говорит ПОСЛЕ
     (пауза 5 сек)
  → повтор WARNING с п.1 (цикл до acknowledge)
```

## UI: Master Warning / Master Caution

На экране кабины — две кнопки-индикатора (как в кокпите):

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐     [Звук: ON/OFF]  │
│  │  MASTER WARNING  │  │  MASTER CAUTION  │                     │
│  │  (красный,мигает)│  │  (жёлтый)        │                     │
│  │  нажми = принял  │  │  нажми = принял  │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                  │
│  ┌── СПИСОК АКТИВНЫХ АЛЕРТОВ (приоритет сверху вниз) ─────────┐ │
│  │                                                              │ │
│  │  [R] ЗАМЫКАНИЕ НА ЗЕМЛЮ                          12:34:56  │ │
│  │      Силовые цепи — нагрузка снята автоматически            │ │
│  │                                                              │ │
│  │  [R] ТЕМПЕРАТУРА ВОДЫ КРИТИЧНА: 116°C             12:34:52  │ │
│  │      >> Снять нагрузку с дизеля                             │ │
│  │                                                              │ │
│  │  [Y] Низкий уровень топлива: 18%                  12:30:00  │ │
│  │      Запас хода: ~45 мин                                    │ │
│  │                                                              │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Master Warning (красная кнопка)
- Мигает когда есть хотя бы один неподтверждённый WARNING
- Клик = acknowledge всех WARNING → перестаёт мигать, голос останавливается
- Новый WARNING → снова мигает и говорит

### Master Caution (жёлтая кнопка)
- Горит постоянно когда есть CAUTION
- Клик = acknowledge всех CAUTION
- Новый CAUTION → снова загорается

### Переключатель звука
- ON — голос + звуковые тоны
- OFF — только визуальные алерты (для отладки)

## Жизненный цикл алерта

```
TRIGGERED (порог пересечён)
  │
  ├─ звуковой тон (зуммер/гонг)
  ├─ голос (приоритетная очередь)
  ├─ Master Warning/Caution загорается
  ├─ алерт в списке: статус ACTIVE
  │
  ▼
ACTIVE (ожидает подтверждения)
  │
  ├─ WARNING: повторяет голос каждые 5 сек
  ├─ визуально: мигает
  │
  │  машинист/диспетчер нажимает Master Warning/Caution
  ▼
ACKNOWLEDGED (подтверждён)
  │
  ├─ голос останавливается
  ├─ мигание прекращается
  ├─ остаётся в списке (приглушённый)
  │
  │  параметр вернулся в норму
  ▼
RESOLVED (разрешён)
  │
  ├─ тихий позитивный тон
  ├─ алерт серый, уходит из списка через 60 сек
  └─ записывается в историю (PostgreSQL)
```

## Техническая реализация

### Голос — Web Speech API (встроен в браузер)

```javascript
class LCAS {
    constructor() {
        this.synth = window.speechSynthesis;
        this.queue = [];
        this.speaking = false;
        this.warningRepeatInterval = null;
    }

    getVoice() {
        const voices = this.synth.getVoices();
        return voices.find(v => v.lang.startsWith('ru')) || voices[0];
    }

    speak(text, priority) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = this.getVoice();
        utterance.lang = 'ru-RU';
        utterance.rate = 1.1;
        utterance.pitch = 0.9;

        if (priority === 'WARNING') {
            this.synth.cancel();
            this.queue.unshift({ utterance, priority, text });
        } else {
            this.queue.push({ utterance, priority, text });
        }
        this.processQueue();
    }

    processQueue() {
        if (this.speaking || this.queue.length === 0) return;
        this.speaking = true;
        const item = this.queue.shift();
        item.utterance.onend = () => {
            this.speaking = false;
            setTimeout(() => this.processQueue(), 2000);
        };
        this.synth.speak(item.utterance);
    }

    triggerWarning(text) {
        this.speak(text, 'WARNING');
        this.warningRepeatInterval = setInterval(() => {
            this.speak(text, 'WARNING');
        }, 5000);
    }

    acknowledge() {
        clearInterval(this.warningRepeatInterval);
        this.synth.cancel();
        this.queue = this.queue.filter(i => i.priority !== 'WARNING');
    }
}
```

### Звуковые тоны — Web Audio API

```javascript
function playWarningTone(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = 'square';
    gain.gain.value = 0.3;
    osc.start();
    // тройной зуммер: бип-бип-бип
    setTimeout(() => { gain.gain.value = 0; }, 150);
    setTimeout(() => { gain.gain.value = 0.3; }, 250);
    setTimeout(() => { gain.gain.value = 0; }, 400);
    setTimeout(() => { gain.gain.value = 0.3; }, 500);
    setTimeout(() => { gain.gain.value = 0; }, 650);
    setTimeout(() => osc.stop(), 700);
}

function playCautionTone(ctx) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.value = 0.2;
    osc.start();
    setTimeout(() => osc.stop(), 300);
}
```

## Предиктивный алерт

Помимо реактивных алертов (порог пересечён), LCAS выдаёт **предиктивные**:

```
Текущий HI: 72 (Внимание)
Тренд: -2.3 в минуту
Прогноз: HI < 50 через ~12 мин

CAUTION голос: "ВНИМАНИЕ. ПРОГНОЗ СНИЖЕНИЯ ИНДЕКСА ЗДОРОВЬЯ"
```

Реализация — линейная экстраполяция последних 5 минут:

```python
def predict_hi(history_5min):
    if len(history_5min) < 2:
        return None
    slope = (history_5min[-1] - history_5min[0]) / len(history_5min)
    if slope >= 0:
        return None  # не ухудшается
    seconds_to_critical = (50 - history_5min[-1]) / slope
    if seconds_to_critical < 900:  # менее 15 мин
        return seconds_to_critical
    return None
```

На графике HI — пунктирная линия прогноза:

```
HI
100 ──────────
               \
 80             \
                 \  ← реальные данные
                  \
 50 ─ ─ ─ ─ ─ ─ ─\─ ─ ─ ← прогноз (пунктир)
                   \
     ──────────────────────
     -5мин    сейчас  +15мин
```

## Позиционирование для жюри

> "Мы применили проверенные принципы авиационных систем оповещения EICAS/ECAM
> к железнодорожной телеметрии. Приоритетная очередь алертов, голосовое оповещение,
> Master Warning/Caution — стандарт авиации, впервые применённый в ЖД-диспетчеризации.
> Наша система — это EICAS для локомотивов."
