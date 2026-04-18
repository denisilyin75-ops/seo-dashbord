import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.DB_PATH || path.join(ROOT, 'data', 'seo.sqlite');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  market TEXT NOT NULL,
  niche TEXT,
  status TEXT DEFAULT 'setup',
  wp_admin_url TEXT,
  wp_api_url TEXT,
  wp_user TEXT,
  wp_app_password TEXT,
  ga4_property_id TEXT,
  gsc_site_url TEXT,
  affiliate_url TEXT,
  domain_registered_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT REFERENCES sites(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  sessions INTEGER DEFAULT 0,
  revenue REAL DEFAULT 0,
  affiliate_clicks INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  rpm REAL DEFAULT 0,
  epc REAL DEFAULT 0,
  ctr REAL DEFAULT 0,
  cr REAL DEFAULT 0,
  UNIQUE(site_id, date)
);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id) ON DELETE CASCADE,
  wp_post_id INTEGER,
  title TEXT NOT NULL,
  url TEXT,
  type TEXT DEFAULT 'review',
  status TEXT DEFAULT 'planned',
  sessions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  cr REAL DEFAULT 0,
  notes TEXT,
  wp_last_sync TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_plan (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT DEFAULT 'review',
  priority TEXT DEFAULT 'medium',
  deadline TEXT,
  status TEXT DEFAULT 'idea',
  phase INTEGER,
  rubric TEXT,
  article_id TEXT REFERENCES articles(id) ON DELETE SET NULL,
  ai_brief TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT,
  article_id TEXT,
  command TEXT NOT NULL,
  result TEXT,
  model TEXT DEFAULT 'claude-sonnet-4-20250514',
  tokens_used INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS deploys (
  id TEXT PRIMARY KEY,
  site_id TEXT REFERENCES sites(id) ON DELETE SET NULL,
  config TEXT,
  ai_plan TEXT,
  status TEXT DEFAULT 'pending',
  log TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS daily_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT REFERENCES sites(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  cards_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(site_id, date)
);

-- Registry агентов (cron-задачи, on-demand воркеры, AI-агенты).
-- Каждый агент — строка здесь. Параметры конфигурируются через UI,
-- расписание хранится в schedule (cron-expr или NULL для on_demand).
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,           -- стабильный идентификатор (metrics_sync, content_freshness, ...)
  name TEXT NOT NULL,            -- человекочитаемое имя
  description TEXT,
  kind TEXT NOT NULL,            -- cron | on_demand | webhook
  schedule TEXT,                 -- cron-expression для kind=cron
  enabled INTEGER DEFAULT 1,
  config_json TEXT,              -- JSON с параметрами (thresholds, filters, API-keys refs)
  last_run_at TEXT,
  last_run_status TEXT,          -- success | error | skipped
  last_run_summary TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- История запусков агента (для анализа, дебага, отчётности)
CREATE TABLE IF NOT EXISTS agent_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  site_id TEXT,                  -- для site-scope агентов
  started_at TEXT DEFAULT (datetime('now')),
  finished_at TEXT,
  status TEXT,                   -- success | error | skipped
  summary TEXT,
  detail TEXT,                   -- JSON c произвольными данными запуска
  tokens_used INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  triggered_by TEXT DEFAULT 'schedule'  -- schedule | manual | webhook
);

-- Расходы по сайтам (для Site Valuation + финансовой аналитики)
-- auto-tracked costs AI-агентов + ручной ввод хостинга/лицензий
CREATE TABLE IF NOT EXISTS site_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT,                 -- NULL для portfolio-wide (shared costs)
  date TEXT NOT NULL,
  category TEXT NOT NULL,       -- hosting | domain | plugins | content | ai_agents | other
  description TEXT,
  amount_usd REAL NOT NULL,
  is_recurring INTEGER DEFAULT 0,
  recurring_period TEXT,        -- monthly | yearly
  created_at TEXT DEFAULT (datetime('now'))
);

-- История оценок стоимости сайта (для трекинга роста капитализации)
CREATE TABLE IF NOT EXISTS site_valuations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL,
  date TEXT NOT NULL,
  revenue_last_12m REAL,
  profit_last_12m REAL,
  avg_monthly_revenue REAL,
  avg_monthly_profit REAL,
  base_multiple REAL,
  final_multiple REAL,
  adjustments TEXT,             -- JSON array of factors
  valuation_low INTEGER,
  valuation_expected INTEGER,
  valuation_high INTEGER,
  recommendations TEXT,         -- JSON array of growth recommendations
  potential_valuation INTEGER,
  potential_timeline_months INTEGER,
  methodology TEXT,
  confidence TEXT,              -- high | medium | low
  created_at TEXT DEFAULT (datetime('now'))
);

-- Журнал изменений статей. Фундамент для Content Freshness Agent.
-- Каждое действие над article (manual edit, WP sync, AI refresh, price update и т.д.)
-- оставляет здесь запись с типом, коротким summary и детальным JSON.
CREATE TABLE IF NOT EXISTS article_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT,
  site_id TEXT,
  kind TEXT NOT NULL,       -- manual_edit | wp_sync_pull | wp_sync_push | ai_refresh | ai_price_update | ai_brief | auto_seo | import | offer_replaced | system_note
  summary TEXT NOT NULL,    -- короткая человекочитаемая ремарка
  detail TEXT,              -- JSON с полными данными изменения (опционально)
  actor TEXT DEFAULT 'system',  -- user email / 'system' / 'ai'
  created_at TEXT DEFAULT (datetime('now'))
);

-- Простой key/value store для пользовательских настроек (MVP single-user).
-- Используется для gamification toggle, impact_per_action overrides и т.д.
CREATE TABLE IF NOT EXISTS user_prefs (
  key        TEXT PRIMARY KEY,
  value      TEXT,                                    -- JSON
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Блог: человеко-читаемая лента «что сделано» прямо в дашборде.
-- Часть мотивационного слоя (см. docs/gamification.md) — напоминалка прогресса.
-- Разница с devlog.md: блог частый (несколько раз в день при активной работе)
-- и narrative-first, а devlog — milestone-сводка недели/спринта.
CREATE TABLE IF NOT EXISTS blog_posts (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT,                                    -- markdown
  tags       TEXT,                                    -- JSON array of strings
  pinned     INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_blog_created ON blog_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_site ON articles(site_id);
CREATE INDEX IF NOT EXISTS idx_plan_site    ON content_plan(site_id);
CREATE INDEX IF NOT EXISTS idx_metrics_site ON site_metrics(site_id, date);
CREATE INDEX IF NOT EXISTS idx_log_site     ON ai_log(site_id, created_at);
CREATE INDEX IF NOT EXISTS idx_brief_site   ON daily_briefs(site_id, date);
CREATE INDEX IF NOT EXISTS idx_revs_article ON article_revisions(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revs_site    ON article_revisions(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_runs   ON agent_runs(agent_id, started_at DESC);
`;

db.exec(SCHEMA);

// ---- Lightweight ALTER-migrations ----
// CREATE TABLE IF NOT EXISTS не добавляет колонки к существующим таблицам.
// Каждая ALTER обёрнута в try-catch: если колонка уже есть — idle.
function softAlter(sql) {
  try { db.exec(sql); } catch (e) { /* column exists */ }
}

softAlter(`ALTER TABLE sites ADD COLUMN domain_registered_at TEXT`);
softAlter(`ALTER TABLE content_plan ADD COLUMN phase INTEGER`);
softAlter(`ALTER TABLE content_plan ADD COLUMN rubric TEXT`);
softAlter(`ALTER TABLE site_valuations ADD COLUMN adjustments_json TEXT`);
softAlter(`ALTER TABLE site_valuations ADD COLUMN mode TEXT DEFAULT 'asset_based'`);
softAlter(`ALTER TABLE agent_runs ADD COLUMN site_id TEXT`);
softAlter(`ALTER TABLE agent_runs ADD COLUMN tokens_used INTEGER DEFAULT 0`);
softAlter(`ALTER TABLE agent_runs ADD COLUMN cost_usd REAL DEFAULT 0`);

// Article Import & Actions Phase 1 — search/filter/bulk
// content_text: plain-text проекция body (для FTS); naturals = title + notes.
//   Когда подключим WP body sync, сюда попадёт полный текст.
// tags: JSON array строк. Используется и для FTS, и для bulk tag add/remove.
// word_count: автоподсчёт (триггеры ниже).
// quality_score: placeholder; заполнит Content Quality Agent (0-100).
softAlter(`ALTER TABLE articles ADD COLUMN content_text TEXT`);
softAlter(`ALTER TABLE articles ADD COLUMN tags TEXT`); // JSON
softAlter(`ALTER TABLE articles ADD COLUMN word_count INTEGER DEFAULT 0`);
softAlter(`ALTER TABLE articles ADD COLUMN quality_score INTEGER`);

// FTS5 виртуальная таблица (contentless — не хранит дубликат текста, только индекс).
// Поиск по title + notes + content_text + tags.
// Триггеры синхронизируют index с таблицей articles.
try {
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
    title, notes, content_text, tags,
    content='articles', content_rowid='rowid',
    tokenize='unicode61 remove_diacritics 2'
  )`);
} catch (e) { /* already exists */ }

// Триггеры — синхронизация articles ↔ articles_fts.
// Обёрнуто в try-catch: при повторном старте триггеры уже есть.
function safeTrigger(sql) {
  try { db.exec(sql); } catch (e) { /* exists */ }
}
safeTrigger(`CREATE TRIGGER IF NOT EXISTS articles_ai_fts AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, notes, content_text, tags)
  VALUES (new.rowid, new.title, new.notes, new.content_text, new.tags);
END`);
safeTrigger(`CREATE TRIGGER IF NOT EXISTS articles_ad_fts AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, notes, content_text, tags)
  VALUES ('delete', old.rowid, old.title, old.notes, old.content_text, old.tags);
END`);
safeTrigger(`CREATE TRIGGER IF NOT EXISTS articles_au_fts AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, notes, content_text, tags)
  VALUES ('delete', old.rowid, old.title, old.notes, old.content_text, old.tags);
  INSERT INTO articles_fts(rowid, title, notes, content_text, tags)
  VALUES (new.rowid, new.title, new.notes, new.content_text, new.tags);
END`);

// Одноразовый rebuild FTS для существующих записей (если FTS пуст, а articles — нет).
// Это покрывает upgrade-кейс: фича добавлена на существующую БД.
try {
  const ftsCount = db.prepare('SELECT COUNT(*) AS n FROM articles_fts').get().n;
  const articlesCount = db.prepare('SELECT COUNT(*) AS n FROM articles').get().n;
  if (articlesCount > 0 && ftsCount === 0) {
    db.exec(`INSERT INTO articles_fts(articles_fts) VALUES('rebuild')`);
  }
} catch (e) { /* ignore */ }

// ------- seed: минимальный демо-набор, только если БД пустая -------
// Seed блога — независимо от sites (может сработать позже, когда sites уже есть).
// Создаёт базовый набор ретроспективных записей «что сделано за 2026-04-17 → 2026-04-18».
// Если блог не пустой — no-op.
export function seedBlogIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM blog_posts').get().n;
  if (count > 0) return { seeded: false };

  const entries = [
    {
      id: 'blog_2026-04-17_init',
      title: 'День 1: запуск SCC + popolkam.ru',
      body: `Заложили фундамент портфеля:\n\n- WordPress + REHub (ReCompare preset) развёрнут для popolkam.ru\n- 5 категорий + 5 подкатегорий под рубрику Кофемашины\n- E-E-A-T страницы (About / Contacts / How we test / Privacy)\n- SCC Daily Brief endpoint с 4 карточками\n- favicon SCC + логотип/favicon для popolkam\n- 4beg.ru подключен через WP REST API (366 постов синхронизированы)\n\nФормулировка supreme principle: «всё для пользователя, не для комиссии».`,
      tags: ['infrastructure', 'popolkam', 'supreme-principle'],
      created_at: '2026-04-17 10:00:00',
    },
    {
      id: 'blog_2026-04-18_agents',
      title: '8 агентов + Article Revisions + Content Plan Progress',
      body: `Agents Panel расширен до 8 агентов (analytics_review, site_valuation, expense_tracker, idea_of_day + 4 предыдущих). Бейджи scope (portfolio/site) + readiness (active/mvp/placeholder).\n\nArticle Revisions MVP: таблица + timeline в модалке с цветовой свежестью (зелёный <30д, жёлтый <6мес, оранжевый <12мес, красный >12мес).\n\nDashboard: поиск + 3 фильтра + пагинация + scroll-to-top (важно для 4beg с 366 статьями).\n\nContent Plan Progress по фазам рубрик.\n\nTop-10 кофемашин — pillar-статья с 10 встроенными TCO-калькуляторами.`,
      tags: ['scc', 'agents', 'popolkam'],
      created_at: '2026-04-18 14:00:00',
    },
    {
      id: 'blog_2026-04-18_strategy',
      title: 'Документационная дисциплина + Managed Services',
      body: `docs/business-model.md §11 — раздел Longevity & Adaptation: горизонты уверенности (5/10/20 лет), основные угрозы, pivot paths.\n\nдобавлены Managed Services как монетизационный слой E — done-for-you, coaching, portfolio acquisition.\n\ndocs/migration-plan.md — полный runbook миграции (<2ч downtime) + disaster recovery.\n\nПравило: каждая итерация → запись в devlog.md, стратегические решения в соответствующих docs/.`,
      tags: ['docs', 'business-model', 'strategy'],
      created_at: '2026-04-18 20:00:00',
    },
    {
      id: 'blog_2026-04-18_valuation',
      title: 'Site Valuation v2 + ValuationPanel UI',
      body: `Двухрежимная модель оценки стоимости: asset-based (ранняя стадия) ↔ hybrid ↔ revenue × multiple (от $500 profit).\n\nКаждый фактор имеет impact_usd, actionable_hint, reason — видно ЧТО прокачать и НАСКОЛЬКО это поднимет стоимость.\n\nНовая вкладка 💰 Капитализация на SiteDetail: текущая оценка с low/expected/high + line chart динамики + список факторов.\n\nПервые оценки: popolkam=$3300, 4beg=$19360 — завышены, требуют калибровки (запланировано P0-01).`,
      tags: ['scc', 'valuation', 'ui'],
      created_at: '2026-04-18 22:00:00',
    },
    {
      id: 'blog_2026-04-18_stage_c',
      title: 'Stage C день 1: калибровка + OpenRouter credits + meta-fields + Gamification Phase A',
      body: `Большая сессия — 8 коммитов:\n\n**P0-01: Site Valuation откалиброван.** PER_ARTICLE_VALUE сильно снижены (review 40→15). Domain age ×$300 max $3000 → ×$100 max $800. Моментум cap $500. Двухуровневая penalty за отсутствие revenue: −40% если сайт «зомби», −20% если активен. Methodology bumped → v2.1_calibrated_2026-04-18. Прод: popolkam $2,104 + 4beg $6,836 = **$8,940 портфель (17.9% к $50k цели)**.\n\n**P0-03: OpenRouter credits в Settings UI.** Карточка с прогресс-баром (зелёный/жёлтый/красный). $4.93 из $5.\n\n**P0-04: popolkam meta-fields в ArticleRow.** WP плагин popolkam-calculators 1.1.0 регистрирует 6 полей с show_in_rest. Теперь редактируем TCO-калькулятор из панели без wp-cli.\n\n**Gamification Phase A:** 💎 Portfolio Value виджет в шапке с дельтой/прогрессом + toast «+$N к капитализации» после публикации/правки. Toggle hide/show (backend всегда считает). Цифры реальные заниженные (review +$15, comparison +$25) — не «motivational».\n\n**Архив:** импортированы старые спецификации (legacy-spec) + GAMIFICATION.md в отдельный каталог.`,
      tags: ['scc', 'gamification', 'valuation', 'milestone'],
      created_at: '2026-04-18 23:45:00',
      pinned: 1,
    },
  ];

  const ins = db.prepare(`INSERT INTO blog_posts
    (id, title, body, tags, pinned, created_at, updated_at)
    VALUES (@id, @title, @body, @tags, @pinned, @created_at, @created_at)`);
  const tx = db.transaction((items) => {
    for (const e of items) {
      ins.run({
        id: e.id,
        title: e.title,
        body: e.body,
        tags: JSON.stringify(e.tags || []),
        pinned: e.pinned || 0,
        created_at: e.created_at,
      });
    }
  });
  tx(entries);
  return { seeded: true, count: entries.length };
}

export function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM sites').get().n;
  if (count > 0) return { seeded: false };

  const insertSite = db.prepare(`INSERT INTO sites
    (id, name, market, niche, status, wp_admin_url, ga4_property_id, gsc_site_url, affiliate_url)
    VALUES (@id, @name, @market, @niche, @status, @wp_admin_url, @ga4_property_id, @gsc_site_url, @affiliate_url)`);

  insertSite.run({
    id: 'popolkam', name: 'popolkam.ru', market: 'RU', niche: 'Кофемашины', status: 'active',
    wp_admin_url: 'https://popolkam.ru/wp-admin', ga4_property_id: 'https://analytics.google.com',
    gsc_site_url: 'https://search.google.com/search-console',
    affiliate_url: 'https://www.admitad.com/ru/webmaster/',
  });
  insertSite.run({
    id: 'koffie', name: 'koffie-expert.nl', market: 'NL', niche: 'Koffiemachines', status: 'setup',
    wp_admin_url: 'https://koffie-expert.nl/wp-admin', ga4_property_id: '#',
    gsc_site_url: '#', affiliate_url: '#',
  });

  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`INSERT INTO site_metrics (site_id, date, sessions, revenue, affiliate_clicks, sales, rpm, epc, ctr, cr)
              VALUES ('popolkam', ?, 4820, 312, 890, 34, 64.73, 0.35, 18.46, 3.82)`).run(today);
  db.prepare(`INSERT INTO site_metrics (site_id, date, sessions, revenue, affiliate_clicks, sales, rpm, epc, ctr, cr)
              VALUES ('koffie',   ?, 0, 0, 0, 0, 0, 0, 0, 0)`).run(today);

  const insertArticle = db.prepare(`INSERT INTO articles
    (id, site_id, title, url, type, status, sessions, clicks, cr, updated_at)
    VALUES (@id, @site_id, @title, @url, @type, @status, @sessions, @clicks, @cr, @updated_at)`);

  const arts = [
    { id:'a1', site_id:'popolkam', title:"Обзор De'Longhi Magnifica S", url:'/obzor-delonghi-magnifica-s/', type:'review',     status:'published', sessions:1240, clicks:312, cr:4.2, updated_at:'2026-03-28' },
    { id:'a2', site_id:'popolkam', title:'Топ-5 кофемашин до 30 000₽',   url:'/top-5-kofemashin-do-30000/',  type:'comparison', status:'published', sessions:980,  clicks:198, cr:3.1, updated_at:'2026-04-01' },
    { id:'a3', site_id:'popolkam', title:"Jura E8 vs De'Longhi ECAM",   url:'/jura-e8-vs-delonghi-ecam/',   type:'comparison', status:'published', sessions:760,  clicks:145, cr:2.8, updated_at:'2026-03-15' },
    { id:'a4', site_id:'popolkam', title:'Как выбрать кофемашину для дома', url:'/kak-vybrat-kofemashinu/', type:'guide',   status:'published', sessions:1840, clicks:235, cr:1.9, updated_at:'2026-04-10' },
    { id:'a5', site_id:'popolkam', title:'Обзор Philips 3200 LatteGo',  url:'/obzor-philips-3200-lattego/', type:'review',     status:'draft',     sessions:0,    clicks:0,   cr:0,   updated_at:'2026-04-14' },
    { id:'a6', site_id:'popolkam', title:'Квиз: Подбор кофемашины',     url:'/quiz-podbor-kofemashiny/',    type:'quiz',       status:'planned',   sessions:0,    clicks:0,   cr:0,   updated_at:null },
  ];
  for (const a of arts) insertArticle.run(a);

  const insertPlan = db.prepare(`INSERT INTO content_plan
    (id, site_id, title, type, priority, deadline, status)
    VALUES (@id, @site_id, @title, @type, @priority, @deadline, @status)`);

  const plan = [
    { id:'p1', site_id:'popolkam', title:'Обзор Saeco GranAroma',        type:'review',     priority:'high',   deadline:'2026-04-20', status:'in_progress' },
    { id:'p2', site_id:'popolkam', title:'Сравнение капсульных машин',   type:'comparison', priority:'high',   deadline:'2026-04-25', status:'queued' },
    { id:'p3', site_id:'popolkam', title:'Гайд по уходу за кофемашиной', type:'guide',      priority:'medium', deadline:'2026-05-01', status:'queued' },
    { id:'p4', site_id:'popolkam', title:'Топ-3 машин для офиса',        type:'comparison', priority:'medium', deadline:'2026-05-10', status:'idea' },
    { id:'p5', site_id:'koffie',   title:'Beste koffiemachine 2026',     type:'comparison', priority:'high',   deadline:'2026-05-15', status:'idea' },
  ];
  for (const p of plan) insertPlan.run(p);

  return { seeded: true };
}
