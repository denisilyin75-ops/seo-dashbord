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

CREATE INDEX IF NOT EXISTS idx_articles_site ON articles(site_id);
CREATE INDEX IF NOT EXISTS idx_plan_site    ON content_plan(site_id);
CREATE INDEX IF NOT EXISTS idx_metrics_site ON site_metrics(site_id, date);
CREATE INDEX IF NOT EXISTS idx_log_site     ON ai_log(site_id, created_at);
`;

db.exec(SCHEMA);

// ------- seed: минимальный демо-набор, только если БД пустая -------
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
