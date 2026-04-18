import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, seedIfEmpty, seedBlogIfEmpty } from './db.js';
import { auth } from './middleware/auth.js';
import { startCron } from './cron.js';

import sitesRouter from './routes/sites.js';
import articlesRouter from './routes/articles.js';
import planRouter from './routes/plan.js';
import aiRouter from './routes/ai.js';
import deployRouter from './routes/deploy.js';
import logRouter from './routes/log.js';
import metricsRouter from './routes/metrics.js';
import dailyRouter from './routes/daily.js';
import agentsRouter from './routes/agents.js';
import prefsRouter from './routes/prefs.js';
import portfolioRouter from './routes/portfolio.js';
import blogRouter from './routes/blog.js';
import contentHealthRouter from './routes/content-health.js';
import importedRouter from './routes/imported.js';
import actionsRouter from './routes/actions.js';
import mergeRouter from './routes/merge.js';
import healthRouter from './routes/health.js';
import { syncAgentsToDb } from './services/agents/registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');
const DIST_DIR  = path.join(ROOT, 'dist');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Seed демо-данные при первом запуске
seedIfEmpty();
seedBlogIfEmpty();

// Синхронизируем registry агентов с БД (добавит новые, обновит описания)
syncAgentsToDb();

// Health + integration status
import { ga4Status } from './services/analytics.js';
import { gscStatus } from './services/searchConsole.js';
import { aiStatus }  from './services/claude.js';
app.get('/api/health', (req, res) => {
  const { n: sites } = db.prepare('SELECT COUNT(*) AS n FROM sites').get();
  res.json({
    ok: true,
    sites,
    ts: new Date().toISOString(),
    integrations: {
      ai:  aiStatus(),
      ga4: ga4Status(),
      gsc: gscStatus(),
      n8n: !!process.env.N8N_WEBHOOK_BASE,
    },
  });
});

// Все /api/* требуют auth (если AUTH_TOKEN задан)
app.use('/api', auth);

app.use('/api/sites', sitesRouter);
app.use('/api', articlesRouter);      // маршруты внутри начинаются с /sites/:siteId/articles или /articles/:id
app.use('/api', planRouter);           // аналогично
app.use('/api/ai', aiRouter);
app.use('/api/deploy', deployRouter);
app.use('/api/deploys', deployRouter); // alias для /api/deploys
app.use('/api/log', logRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/daily-brief', dailyRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/prefs', prefsRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/blog', blogRouter);
app.use('/api', contentHealthRouter);   // /api/quality/* + /api/sites/:id/content-health + /api/content-health/:id
app.use('/api', importedRouter);        // /api/imported + /api/imported/:id
app.use('/api', actionsRouter);         // /api/actions + /api/actions/:id
app.use('/api', mergeRouter);           // /api/merge/preview + /api/merge/previews
app.use('/api', healthRouter);          // /api/health/exit-readiness + /api/health/portfolio-quality

// 404 для API
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

// ---- Static frontend (production) ----
// В dev используется Vite dev server (5173) с прокси на :3001.
// В production Express сам отдаёт собранный фронт + SPA-fallback.
if (process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { maxAge: '30d', index: false }));
  app.get('*', (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
  console.log(`📦 Serving static frontend from ${DIST_DIR}`);
}

app.listen(PORT, () => {
  console.log(`🚀 SEO Command Center API → http://localhost:${PORT}`);
  startCron();
});
