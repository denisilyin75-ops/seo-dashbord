# Image Curator — агент работы с изображениями

> **Статус:** design v1 — 2026-04-18 (planned, not implemented)
> **Живёт в:** `catalog-service` (внутренний subcomponent, не standalone)
> **Scope:** cross-portfolio (обслуживает popolkam, aykakchisto, 4beg, будущие сайты)
> **Kind:** cron (audit/optimize) + event-driven (source при публикации)
> **Связь:** `docs/catalog-module-architecture.md`, `docs/agents/content-quality-agent.md`

---

## 0. Миссия

**Один место — все изображения портфеля под контролем.** Агент:

1. **Собирает** image assets из легальных источников (manufacturer press kits, Admitad feeds, CC0 stock, AI-генерация)
2. **Хранит** с полным license metadata (кто владеет, какая лицензия, attribution)
3. **Оптимизирует** (WebP, responsive srcset, EXIF cleanup, lazy)
4. **Следит за качеством** (audit broken, stale, under-attribution)
5. **Отдаёт** сайтам через API с готовыми варьянтами

**Supreme-соответствие:** честный attribution + никаких AI-fake'ов реальных товаров.

---

## 1. Легальные источники — формализация

### 1.1 Tier A — safe (всегда можно)

| Источник | License | Usage constraint |
|---|---|---|
| **Admitad XML feeds** `picture` / `image_url` | partner license (contractual) | Credit retailer + product URL |
| **Я.Маркет YML feeds** `picture` | partner license | Credit retailer |
| **Unsplash, Pexels, Pixabay** (CC0) | CC0 — public domain | No attribution required, но даём для user trust |
| **Manufacturer press kits** (delonghi.com/press, newsroom.philips.com, jura.com/press) | editorial license | Credit manufacturer, no modification, no false endorsement |
| **Наша фотография** | own work | — |
| **AI-generated (наш prompt)** | ours | Обязательно метить как «иллюстрация» если не photo-realistic product |

### 1.2 Tier B — grey zone (ограниченно)

| Источник | Когда ок | Mitigation |
|---|---|---|
| **Official product pages** (manufacturer site без press section) | Editorial review / критика по ГК РФ ч.4 ст.1274 («цитирование в оправданном объёме») | Credit + backlink + не более 30% визуала статьи |
| **Retailer listings** (Ozon/WB/MVideo) | Только если image принадлежит бренду (check EXIF / source chain) | Предпочитаем брать через Admitad того же retailer |

### 1.3 Tier C — никогда

- **Getty Images / Shutterstock / Alamy** без платной лицензии → $1500-8000 штраф в US, $300-500 в RU за фото
- **AI-генерация реальных моделей товаров** («сгенерируй DeLonghi Magnifica S») → fraud / misleading
- **Instagram / личные блоги** без явного письменного разрешения

### 1.4 AI-generation — где используем

| Тип | AI ok? | Почему |
|---|---|---|
| Hero pillar-article (абстрактная иллюстрация) | ✅ | Концепт, не утверждение о товаре |
| Diagrams (TCO breakdown, «как работает молочник») | ✅ | Схема |
| Lifestyle (кухня, человек с чашкой) | ✅ | Generic |
| Конкретный товар (DeLonghi Magnifica) | ❌ | Misleading, даже если хорошо выглядит |
| Comparison visual (2 машины рядом) | ❌ | Тот же fraud risk |

Метка для AI-generated: EXIF `Artist=Popolkam AI illustration`, alt должен содержать «иллюстрация» или «концепт», НЕ «photo».

---

## 2. Data model (расширение catalog-service schema)

```sql
-- =====================================================
-- Image assets
-- =====================================================
CREATE TABLE image_assets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_url      TEXT NOT NULL,                   -- source URL
  storage_url       TEXT NOT NULL,                   -- наш CDN/storage path
  storage_path      TEXT NOT NULL,                   -- local filesystem path
  checksum_sha256   TEXT UNIQUE NOT NULL,            -- dedup по содержимому
  width             INT NOT NULL,
  height            INT NOT NULL,
  format            TEXT NOT NULL,                   -- webp | jpg | png | svg
  size_bytes        INT,

  -- License & attribution
  license_tier      TEXT NOT NULL,                   -- A | B | C (see §1)
  license_type      TEXT,                            -- cc0 | admitad | ya_market | press_kit | editorial_citation | ai_generated | own
  license_source    TEXT,                            -- "admitad:delonghi-ru" | "delonghi.com/press" | "unsplash.com"
  attribution_text  TEXT,                            -- "DeLonghi Press Room" | "Фото: Unsplash / @user"
  attribution_url   TEXT,
  usage_note        TEXT,                            -- дополнительные constraints если есть

  -- AI metadata (если AI-gen)
  ai_provider       TEXT,                            -- "openrouter:flux" | "local:sdxl"
  ai_prompt         TEXT,
  ai_model_version  TEXT,

  -- Context
  purpose           TEXT,                            -- "product_main" | "product_gallery" | "concept" | "lifestyle" | "diagram"
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Quality
  quality_score     REAL,                            -- 0-1, computed by Image Curator
  quality_issues    JSONB,                           -- [{issue: "low_res", severity: "yellow"}]

  -- Lifecycle
  first_seen_at     TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ,
  is_active         BOOLEAN DEFAULT TRUE,
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX idx_image_product ON image_assets(product_id);
CREATE INDEX idx_image_purpose ON image_assets(purpose);
CREATE INDEX idx_image_license ON image_assets(license_tier);

-- Responsive variants (срез нескольких размеров из одного master)
CREATE TABLE image_variants (
  id             BIGSERIAL PRIMARY KEY,
  asset_id       UUID NOT NULL REFERENCES image_assets(id) ON DELETE CASCADE,
  variant_key    TEXT NOT NULL,                   -- "400w" | "800w" | "1200w" | "thumb-150"
  storage_url    TEXT NOT NULL,
  width          INT NOT NULL,
  height         INT NOT NULL,
  format         TEXT NOT NULL,
  size_bytes     INT,
  UNIQUE(asset_id, variant_key)
);

-- Usage tracking (где картинка использована — для refresh impact analysis)
CREATE TABLE image_usage (
  id            BIGSERIAL PRIMARY KEY,
  asset_id      UUID NOT NULL REFERENCES image_assets(id),
  site_slug     TEXT NOT NULL,                    -- "popolkam"
  post_id       INT,                              -- WP post ID
  post_url      TEXT,
  usage_type    TEXT,                             -- "featured" | "inline" | "gallery"
  first_used_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(asset_id, site_slug, post_id, usage_type)
);
```

---

## 3. Provider abstraction (для AI-gen)

Ключевое решение: **интерфейс поверх провайдеров**. Phase 1 используем OpenRouter Flux, Phase 2 переключаемся на локальный SDXL — смена адаптера, не переписывание.

### 3.1 Interface

```typescript
// catalog-service/src/image-curator/providers/types.ts

export type ImageGenRequest = {
  prompt: string;                      // "Editorial illustration of coffee brewing process, minimalist, warm tones"
  negativePrompt?: string;             // "text, watermark, logo, trademark"
  aspectRatio: '1:1' | '16:9' | '4:3' | '3:2';
  width?: number;                      // optional explicit
  height?: number;
  style?: 'photo' | 'illustration' | 'diagram' | 'concept';
  quality?: 'draft' | 'standard' | 'high';
  seed?: number;                       // reproducibility
};

export type ImageGenResult = {
  imageBytes: Buffer;
  mimeType: string;
  width: number;
  height: number;
  providerMetadata: {
    provider: string;                  // "openrouter:flux" | "local:sdxl"
    modelVersion: string;
    seed?: number;
    elapsedMs: number;
    costUsd?: number;
  };
};

export interface ImageGenProvider {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  generate(req: ImageGenRequest): Promise<ImageGenResult>;
  estimateCost(req: ImageGenRequest): Promise<number>; // USD
}
```

### 3.2 Implementations

```typescript
// openrouter-flux.provider.ts — Phase 1
export class OpenRouterFluxProvider implements ImageGenProvider {
  name = 'openrouter:flux';

  constructor(private apiKey: string) {}

  async isAvailable() {
    return Boolean(this.apiKey) && await this.ping();
  }

  async generate(req: ImageGenRequest): Promise<ImageGenResult> {
    const start = Date.now();
    const { width, height } = this.resolveDimensions(req);

    const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/flux-1.1-pro',
        prompt: req.prompt,
        negative_prompt: req.negativePrompt,
        width, height,
        seed: req.seed,
      }),
    });

    if (!response.ok) throw new Error(`Flux API: ${response.status}`);
    const data = await response.json();
    const imageBytes = Buffer.from(data.image, 'base64');

    return {
      imageBytes, mimeType: 'image/webp', width, height,
      providerMetadata: {
        provider: this.name,
        modelVersion: data.model_version ?? 'flux-1.1-pro',
        seed: data.seed,
        elapsedMs: Date.now() - start,
        costUsd: 0.04,   // ~$0.04 per image на Flux 1.1 Pro
      },
    };
  }

  async estimateCost(req: ImageGenRequest) {
    return req.quality === 'high' ? 0.055 : 0.04;
  }
}

// local-sdxl.provider.ts — Phase 2 (когда GPU online)
export class LocalSDXLProvider implements ImageGenProvider {
  name = 'local:sdxl';

  constructor(private endpoint: string /* "http://llm-host:7860" через Tailscale */) {}

  async isAvailable() {
    try {
      const r = await fetch(`${this.endpoint}/sdapi/v1/options`, { signal: AbortSignal.timeout(3000) });
      return r.ok;
    } catch { return false; }
  }

  async generate(req: ImageGenRequest): Promise<ImageGenResult> {
    const start = Date.now();
    const { width, height } = this.resolveDimensions(req);

    const r = await fetch(`${this.endpoint}/sdapi/v1/txt2img`, {
      method: 'POST',
      body: JSON.stringify({
        prompt: req.prompt,
        negative_prompt: req.negativePrompt,
        width, height,
        steps: req.quality === 'high' ? 50 : 25,
        sampler_name: 'DPM++ 2M Karras',
        seed: req.seed ?? -1,
      }),
    });

    const data = await r.json();
    const imageBytes = Buffer.from(data.images[0], 'base64');

    return {
      imageBytes, mimeType: 'image/png', width, height,
      providerMetadata: {
        provider: this.name,
        modelVersion: data.info ? JSON.parse(data.info).sd_model_name : 'sdxl-base-1.0',
        seed: data.info ? JSON.parse(data.info).seed : undefined,
        elapsedMs: Date.now() - start,
        costUsd: 0.002,  // electricity only
      },
    };
  }

  async estimateCost() { return 0.002; }
}
```

### 3.3 Router

```typescript
// provider-router.ts
export class ImageGenRouter {
  constructor(private providers: ImageGenProvider[]) {}

  async route(req: ImageGenRequest): Promise<ImageGenResult> {
    // Priority: local SDXL first (cheaper) → OpenRouter Flux fallback
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        try {
          return await provider.generate(req);
        } catch (err) {
          console.warn(`[image-gen] ${provider.name} failed, trying next`, err);
        }
      }
    }
    throw new Error('No image provider available');
  }
}

// Bootstrap (catalog-service/src/index.ts)
const router = new ImageGenRouter([
  new LocalSDXLProvider(env.LOCAL_SDXL_URL),           // Phase 2 availability
  new OpenRouterFluxProvider(env.OPENROUTER_API_KEY),  // always fallback
]);
```

**Как Phase 1 → Phase 2 переход работает:** просто появляется `LOCAL_SDXL_URL` в `.env`, `LocalSDXLProvider.isAvailable()` возвращает true, router автоматически предпочитает его. **Код сайтов и агентов не трогаем.**

---

## 4. Workflow — 4 mode'а

### 4.1 Source mode (event-driven)

Запускается при создании/публикации статьи. Input: `{ site, post_id, product_id | topic }`.

```
1. Если product_id известен:
   a. Проверить image_assets WHERE product_id = X AND purpose = 'product_main'
      → если есть active → return (hit)
   b. Иначе: fetch cascade:
      Tier A → Admitad feed picture URL
      → manufacturer press kit (site-specific parser)
      → CC0 Unsplash API search by brand + model
      → AI-generation (concept, НЕ реальный товар)
   c. Для каждого источника: download, validate, store, record license

2. Если topic (без product_id):
   - Pillar-article "Как выбрать кофемашину" → AI concept + CC0 lifestyle
   - Comparison "X vs Y" → product images каждой модели + AI-generated splash
   - Guide "Уход за кофемашиной" → AI diagrams + CC0 stock
```

**Cost per article:**
- All Tier A: $0 (feeds/CC0)
- With 1-2 AI-gen (Flux): $0.04-0.08
- Phase 2 all-local: ~$0.01 (electricity)

### 4.2 Audit mode (weekly cron)

Проверяет все активные image_assets + image_usage:

```
For each image_asset WHERE is_active AND last_validated_at < NOW() - 7 days:
  1. HEAD request на storage_url → 200?
  2. original_url → ещё жив?  (для Tier A/B source monitoring)
  3. Size sanity check (резкое изменение = корруп)
  4. License still valid? (если Tier A manufacturer поменял политику)

For each image_usage WHERE post_id:
  1. post_url → img src всё ещё указывает на нашу запись?
  2. Если нет → unlink (это освобождает asset от usage tracking)

Output: issues в content_health table (signal='image_issue', severity per rule)
```

### 4.3 Optimize mode (daily cron)

```
For each image_asset WHERE format IN ('jpg', 'png') OR no WebP variant:
  1. Sharp conversion: master → WebP quality=85
  2. Generate variants: 400w / 800w / 1200w (для srcset)
  3. Strip EXIF (privacy + size)
  4. Record in image_variants

For each post на сайтах портфеля:
  1. Parse HTML → все <img>
  2. Если src указывает на нашу asset без srcset → append srcset
  3. Если <img> не lazy → add loading="lazy"
```

### 4.4 Refresh mode (quarterly cron)

```
For each product WHERE last_image_refresh < NOW() - 3 months:
  1. Refetch Tier A sources (может обновилось)
  2. Compare checksums — если отличается, создать новый asset, старый mark is_active=FALSE
  3. Notify operator: "Image для X обновлён (новая упаковка/модель?)"
```

---

## 5. REST API (catalog-service)

```
GET  /api/catalog/products/:id/images
  Response: {
    main: { url, srcset, alt_suggestion, license },
    gallery: [{url, srcset, alt, license}, ...],
    licenses: [{ source, attribution_text, attribution_url }]
  }

POST /api/catalog/images/source
  Body: { product_id?, topic?, purpose, aspect_ratio, force_ai?: boolean }
  Response: { asset_id, url, license_metadata }
  (triggers Source mode immediately — used when WP publishes post)

GET  /api/catalog/images/:asset_id
  Response: full asset + variants + usage

POST /api/catalog/images/:asset_id/validate
  Response: { ok: bool, issues: [...] }
  (manual trigger audit для одного asset)

GET  /api/catalog/images/health
  Response: { total, active, broken: N, low_quality: M, missing_license: K }
```

---

## 6. WP-интеграция (через catalog-client plugin)

Плагин `popolkam-catalog-client` (и близнецы на aykakchisto, 4beg):

1. **Gutenberg block «Product Image»** — выбор product_id, автоматически тянет main image + gallery с srcset
2. **Shortcode `[catalog_image product="uuid" variant="main|gallery"]`** — inline использование
3. **Auto-linking featured image:** при публикации post если custom field `popolkam_machine_product_id` = X → REST call `/images/source` + set as featured
4. **Attribution footer:** plugin рендерит maleньким шрифтом ниже image: «Image: [attribution_text] | license: [license_type]»

---

## 7. Quality scoring

Image получает `quality_score` 0-1 при добавлении:

```
quality_score = 0.4 * resolution_score      # 0 для <800px, 1 для >=1600px
              + 0.2 * compression_score     # размер vs resolution ratio
              + 0.2 * aspect_conformance    # соответствие purpose (product_main = 1:1 или 4:3)
              + 0.1 * license_tier_score    # Tier A=1, B=0.7, AI=0.6 в зависимости от purpose
              + 0.1 * source_authority      # manufacturer > retailer > stock > AI
```

Quality issues (JSONB):
```json
[
  { "issue": "low_resolution", "value": "640x480", "severity": "yellow" },
  { "issue": "no_alt_suggested", "severity": "yellow" },
  { "issue": "missing_attribution", "severity": "red" }
]
```

---

## 8. Anti-abuse & safety

| Risk | Mitigation |
|---|---|
| **AI-gen hallucinates brand logo** | Negative prompt: `"logo, text, watermark, trademark, brand name"` обязательно в каждом AI request |
| **Manufacturer меняет политику press-kit** | `license_type=press_kit_<manufacturer>` + quarterly refresh mode проверяет legitimacy |
| **Storage blow-up** (5000 products × 5 variants = 25k files) | Variants only on demand (первый GET генерирует и кеширует). `storage_path` уборка при `is_active=FALSE` старше 30 дней |
| **Duplicate downloads** | `checksum_sha256` UNIQUE — image с таким же content reuse'ается |
| **Hotlink vs copy** | По умолчанию копируем локально (иначе partner меняет URL → у нас 404). Исключение: Unsplash разрешает hotlink, можем не качать если place constraints |
| **EU / RU копирайт claims** | Полный audit trail в `license_source` + `original_url`. При жалобе — trace back + replace |

---

## 9. Cost model

### Phase 1 (OpenRouter Flux, бюджет на тесты)

Предположим 30 статей первого месяца × 2 image calls × $0.04 = **$2.40/мес**. В рамках разумного на тесты.

Worst case (100 статей всех сайтов × 3 images × $0.04) = **$12/мес**. Контролируемо.

### Phase 2 (local SDXL, electricity only)

~5-8 kWh / день при постоянной работе = $10-20/мес. Но основной кейс — on-demand, реально ~$3-5/мес.

### Storage

- Phase 1: 500 products × avg 3 images × 500KB = 750MB. VPS disk ок.
- Phase 3 (5000 products × 5 variants): ~25GB. Рассматриваем Cloudflare R2 ($0.015/GB = $0.38/мес).

---

## 10. Phasing

| Phase | Scope | Trigger |
|---|---|---|
| **1a (сразу после Phase 1 catalog)** | Schema + Tier A fetching (Admitad feeds только) + WP plugin basic integration | Есть catalog с 200+ products |
| **1b (+ 2 недели)** | Audit mode + Optimize mode + OpenRouter Flux провайдер + concept AI-gen для pillar-articles | Phase 1a стабилен |
| **2 (+ month)** | Manufacturer press kit parsers (3-5 основных брендов) + Refresh mode | Phase 1b + first-month data для приоритизации |
| **3 (GPU online)** | Local SDXL провайдер подключается, routing переключается автоматически | `LOCAL_SDXL_URL` set |
| **4 (scale)** | Cloudflare R2 migration, multi-variant CDN, smart attribution UI в постах | 5000+ assets |

---

## 11. Open decisions

1. **Storage: local FS или S3-compatible с самого начала?** — рекомендация: local FS Phase 1-2, R2 Phase 3+. R2 migration = simple S3 SDK swap.
2. **Attribution отображать всегда или только для non-CC0?** — рекомендация: всегда (supreme честность + trust), малым шрифтом.
3. **AI-gen стиль гайд для brand-consistency** — отдельный prompt template для popolkam (warm, engineering) vs aykakchisto (bright, clean). Нужен brand system в JSON.
4. **Право каждого сайта запрашивать/редактировать любой asset** — per-site scope как в catalog API keys? — рекомендация: да, site может `GET` любой, но `POST /source` ограничен scope (category в subscription).

---

## 12. Связанные документы

- `docs/catalog-module-architecture.md` — базовый catalog-service, где Image Curator живёт
- `docs/agents/content-quality-agent.md` — потребитель: quality agent использует image_assets + quality_score
- `docs/ai-routing.md` — общий routing паттерн, image gen следует той же модели
- `docs/brand/popolkam/README.md` — визуальные правила для AI-prompt templates
