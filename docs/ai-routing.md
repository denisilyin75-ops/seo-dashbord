# AI Routing — гибридная стратегия cloud + local LLM

> **Статус:** v1 draft — 2026-04-18
> **Когда читать:** при добавлении нового AI-вызова в код, при планировании bulk-операций, при разговоре об AI costs
> **Связь:** расширяет `docs/business-model.md §11 AI Routing` (там сокращённая версия)

---

## 0. TL;DR

Три провайдера, routing по типу задачи:

1. **OpenRouter → Claude Sonnet-4** — user-facing контент, качество критично (~$3/M input, $15/M output)
2. **OpenRouter → Claude Haiku-4** — быстрые простые операции, UX-latency важен (~$0.25/M input, $1.25/M output)
3. **Local LLM** (Ollama/LM Studio) — bulk обработка, privacy, cost-sensitive (~$0)

**Fallback chain:** local → Haiku → Sonnet. Если local сервер недоступен → Haiku. Если Haiku упал → Sonnet.

## 1. Типы задач и оптимальный провайдер

### 1.1 Quality-critical, user-facing (Claude Sonnet)

**Примеры:**
- Публикация статьи через AI-drafting
- AI-бриф для нового обзора
- Generate Site Plan в Deploy Wizard
- Creative idea generation

**Почему Sonnet:** ошибка = читатель видит плохой контент → trust damage. Стоимость ×12 относительно Haiku оправдана.

**Max tokens:** 2500-3500 output, зависит от задачи.

**Caching:** system prompt кэшируется через Anthropic prompt caching → −50-80% на повторах (особенно AI-бриф, где большая часть системного промпта одинаковая).

### 1.2 Speed-sensitive, simple operations (Claude Haiku)

**Примеры:**
- NL quiz parsing: `"белый чайник 2л"` → `{color: "white", capacity_l: 2}`
- Daily Brief card comments («почему упал трафик»)
- Tag/category suggestion
- Meta description generation
- Short-form Q&A (FAQ items)

**Почему Haiku:** задача простая, latency чувствительна (пользователь ждёт результат), cost matters но не предельно. Sonnet overkill, local на этом latency медленнее Haiku.

**Max tokens:** 500-1500.

### 1.3 Bulk + privacy + cost-sensitive (Local LLM)

**Примеры:**
- Attribute enrichment партнёрского feed (5000 offers × 500 tokens = 2.5M tokens / batch)
- Site Guardian сканирование всех страниц (дифф, quality check)
- Content Freshness агент (анализирует наши статьи, приватные данные)
- Batch translation (если будем делать en.aykakchisto.com)
- Embedding для RAG (Phase 3)

**Почему local:** 
- Объём: 2.5M tokens × daily = 75M/мес = ~$225/мес на Haiku. На local = $0 (электричество).
- Privacy: наши статьи + feed данные не уходят third-party.
- Scale: 10x батч — те же $0. Cloud линейно дороже.

**Trade-offs:**
- Качество ниже чем Sonnet, но для structured extraction / tagging достаточно
- Latency выше (зависит от GPU) — не для interactive
- Надёжность ниже (local сервер может упасть, нужен fallback)

**Рекомендуемые модели:**
- `qwen2.5-7b-instruct` — хороший русский, быстрый, ~15GB RAM
- `mistral-7b-instruct-v0.3` — проверенная, средне для русского
- `llama3.2-8b-instruct` — сильна на EN, достаточно на RU для structured extraction
- `phi-3.5-mini-instruct` — 3.8B, быстрая, для совсем простых задач

**Железо минимум:** 16GB RAM CPU-only работает но медленно (~5-15 tokens/s). GPU (RTX 3060+ с 12GB VRAM) комфортно (~30-50 tokens/s).

## 2. Интеграция в код

### 2.1 Текущее состояние

`server/services/claude.js` уже поддерживает два провайдера:
- `anthropic` (прямой SDK @anthropic-ai/sdk)
- `openrouter` (HTTP к OpenRouter OpenAI-compatible endpoint)

Выбор через `AI_PROVIDER` env или auto (если есть OPENROUTER_API_KEY → openrouter).

### 2.2 Target-состояние

Добавить третьего провайдера:

```js
// server/services/claude.js

async function callLocal({ system, userMessage, maxTokens, model }) {
  const url = process.env.LOCAL_AI_URL;   // http://localhost:11434 для Ollama
  const key = process.env.LOCAL_AI_KEY || '';
  if (!url) return null;

  const res = await fetch(`${url}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': key ? `Bearer ${key}` : undefined,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || process.env.LOCAL_AI_MODEL || 'qwen2.5:7b-instruct',
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
    }),
  });
  if (!res.ok) throw new Error(`Local AI ${res.status}`);
  const data = await res.json();
  return {
    text: data.choices?.[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens || 0,
  };
}
```

### 2.3 Smart routing

Вместо `getProvider()` глобального — по task type:

```js
// server/services/claude.js

export async function executeCommand(command, context = {}, opts = {}) {
  const taskType = opts.taskType || 'default';
  // 'quality' | 'fast' | 'bulk' | 'default'

  const plan = routeTask(taskType);
  const result = await tryChain(plan, { command, context });
  return result;
}

function routeTask(taskType) {
  switch (taskType) {
    case 'quality':
      return [{ provider: 'openrouter', model: 'anthropic/claude-sonnet-4' }];

    case 'fast':
      return [
        { provider: 'openrouter', model: 'anthropic/claude-haiku-4' },
        { provider: 'openrouter', model: 'anthropic/claude-sonnet-4' },  // fallback
      ];

    case 'bulk':
      return [
        { provider: 'local', model: process.env.LOCAL_AI_MODEL },
        { provider: 'openrouter', model: 'anthropic/claude-haiku-4' },   // fallback
      ];

    default:
      return [{ provider: 'openrouter', model: 'anthropic/claude-haiku-4' }];
  }
}

async function tryChain(plan, args) {
  for (const step of plan) {
    try {
      const call = { anthropic: callAnthropic, openrouter: callOpenRouter, local: callLocal }[step.provider];
      const r = await call({ ...args, model: step.model });
      if (r) return { ...r, provider: step.provider, model: step.model };
    } catch (e) {
      console.warn(`[AI] Provider ${step.provider} failed: ${e.message}, trying next`);
    }
  }
  throw new Error('All AI providers failed');
}
```

### 2.4 Настройка ENV

```bash
# .env на проде

# Quality (user-facing)
OPENROUTER_API_KEY=sk-or-v1-...

# Fallback / classic
ANTHROPIC_API_KEY=sk-ant-...

# Local LLM (bulk tasks)
LOCAL_AI_URL=http://192.168.1.X:11434          # или http://host.docker.internal:11434 для Mac
LOCAL_AI_MODEL=qwen2.5:7b-instruct
# LOCAL_AI_KEY=                                 # обычно не нужен для Ollama
```

## 3. Экономический расчёт

### Baseline: если всё через OpenRouter Sonnet

| Задача | Объём/мес | Sonnet cost |
|---|---|---|
| AI-бриф для Review (×10/мес) | 10 × 30k tokens = 300k | $1 |
| NL quiz parsing | 500 × 500 = 250k | $0.75 |
| Daily Brief comments | 30 × 2k = 60k | $0.20 |
| Ideas | 50 × 3k = 150k | $0.50 |
| Feed enrichment (5k offers × 500 tokens × 30 дней) | 75M | **$225** |
| Site Guardian (~100 страниц × 3k × 30) | 9M | **$27** |
| **Итого/мес** | | **$254** |

### Target: smart routing

| Задача | Провайдер | Cost |
|---|---|---|
| AI-бриф | Sonnet | $1 |
| NL quiz parsing | Haiku | $0.06 |
| Daily Brief | Haiku | $0.02 |
| Ideas | Sonnet | $0.50 |
| Feed enrichment | **Local** | **$0** |
| Site Guardian | **Local** | **$0** |
| **Итого/мес** | | **$1.58** |

**Экономия 99%.** На scale (4 рубрики × 10k offers + 500 страниц) — сохраняем $1200+/мес.

### Точки безубыточности для local

- Электричество GPU RTX 3060: ~80W × 4ч/сутки (batch ночью) = 10 kWh/мес = ~50₽/мес (~$0.60)
- Amortization железа: $500 server / 36 мес = $14/мес
- **Итого local:** ~$15/мес
- Профит: $254 - $15 = **$239/мес экономии = $2860/год**

Окупается за первый месяц scaling.

## 3.5 Наш фактический LLM host (подтверждено 2026-04-18)

**Hardware:** 2×RTX 3090 (48GB VRAM total), 96GB RAM, Ryzen 9, 4TB SSD, 18TB HDD.

**Что это открывает (не нужно spec'ать абстрактно — у нас это реально):**

| Модель | Quant | VRAM | Speed | Использование |
|---|---|---|---|---|
| **Qwen2.5-72B-Instruct** | Q4_K_M | ~42GB | ~20 tokens/s | Flagship — сложные задачи где нужно качество (publishing assistant, deep reasoning) |
| **Qwen2.5-7B-Instruct** | FP16 | ~14GB | ~60 tokens/s | Bulk fast — enrichment, quick extraction |
| **Mistral-Nemo-12B-Instruct** | Q4 | ~7GB | ~50 tokens/s | Альтернатива 7B с большим контекстом |
| **BGE-M3** (embedding) | FP16 | ~2GB | 1000+ emb/s | Все embeddings для RAG |
| **Qwen3-Embedding** (если выйдет стабильно) | FP16 | ~3GB | — | Русскоязычные embeddings (опция) |

**Конкурентные модели одновременно:** Qwen-72B (42GB) + Qwen-7B (14GB, в резерве на 2-й GPU) + BGE (2GB, на GPU 1 рядом) = **параллельно 2-3 активных модели** без ограничений.

**VRAM головной запас:** 48 - 42 = 6GB свободно на GPU1, +24GB GPU2 = **30GB headroom** для любых экспериментов.

**Tailscale:** сервер подключится в mesh VPN, SCC обращается через `http://<tailscale-hostname>:11434`. Без публичного IP. **Privacy + security из коробки.**

---

## 4. Docker integration

Local LLM не внутри docker (WP+SCC stack), а отдельно:

**Вариант A — На host machine (рекомендован):**
- Ollama установлен на hosting машине (5.129.245.98 или домашнем ПК пользователя)
- В .env SCC: `LOCAL_AI_URL=http://host.docker.internal:11434` (Docker → host bridge)
- Или конкретный IP если Ollama на другой машине в сети

**Вариант B — Ollama контейнер рядом:**
- Добавить сервис в docker-compose.yml SCC:
  ```yaml
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama-models:/root/.ollama
    ports:
      - "11434:11434"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
  ```
- Плюс: изолировано, легко deploy
- Минус: жирные модели (7B = ~4-5GB) в volume, нужен GPU на сервере

**Вариант C — Отдельный LLM host:**
- Отдельная машина с GPU, expose Ollama API
- SCC на основном VPS вызывает через WireGuard/Tailscale VPN (для безопасности)
- Плюс: core SCC VPS не требует GPU
- Минус: управление двумя серверами

**Рекомендуемый путь:** начать с варианта A (тестирование на машине пользователя, пока у нас на сервере нет GPU), потом Phase 2+ — решение про GPU hosting.

## 5. Fallback надёжность

Chain:
1. Try local
2. On failure/timeout (>10 сек для bulk) → OpenRouter Haiku
3. On failure → OpenRouter Sonnet
4. On failure → stub / error

Logging: каждый fallback записывается в `ai_log` с полем `fallback_level` (0=primary, 1=secondary, 2=tertiary). Метрики в SCC Dashboard: «Local AI uptime: 98.2% / Haiku fallback 1.5% / Sonnet fallback 0.3%».

## 6. Мониторинг в SCC

Добавить в **Settings → AI-бюджет (OpenRouter)** карточку:
- Разбивка расходов по провайдерам
- Разбивка по task types (сколько на enrichment, сколько на briefs и т.д.)
- Fallback frequency (Local uptime %)
- При fallback частоте >10% → alert

## 7. Security

- Local AI endpoint — **НЕ открывать публично**. Только внутренняя сеть / VPN
- OpenRouter ключ — ротация каждые 3-6 мес
- Anthropic прямой ключ — рядом как fallback, не основной
- Секреты в `.env`, не в коммитах
- Для Ollama: если открыт в локальной сети — firewall на только Docker bridge

## 8. Roadmap интеграции

| Phase | Что | Effort |
|---|---|---|
| Phase 0 (текущий) | Только OpenRouter (уже есть), auto Haiku/Sonnet через AI_MODEL env | — |
| Phase 1 (Week 3-6 Vision 2.0) | Добавить local provider в `claude.js`, task-based routing, тест на dev | 6-8 часов |
| Phase 2 (Month 2-3) | Fallback chain с retry, метрики в Dashboard, routing rules в Settings | 1 день |
| Phase 3 (когда GPU host) | Production Ollama stack, мониторинг uptime, auto-scaling batch jobs | 2 дня |

## Связанные документы

- `docs/business-model.md §11` — AI Routing как часть архитектурных решений
- `docs/agents.md` — какие агенты нагружают какой провайдер
- `server/services/claude.js` — текущая реализация
- `docs/backlog.md` — задачи Phase 1-3 integration
