import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getToken, setToken as saveAuthToken } from '../api/client.js';
import { Btn, Inp, Badge } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { Skeleton } from '../components/Skeleton.jsx';
import { notifyGamificationChanged } from '../components/PortfolioWidget.jsx';
import { APP_VERSION, APP_COMMIT, buildInfoLines } from '../utils/version.js';

export default function Settings() {
  const toast = useToast();
  const [token, setTokenInput] = useState(getToken());
  const [health, setHealth] = useState(null);
  const [healthErr, setHealthErr] = useState(null);
  const [sites, setSites] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);
  const [credits, setCredits] = useState(null);
  const [creditsErr, setCreditsErr] = useState(null);
  const [gamPrefs, setGamPrefs] = useState(null);  // { showPortfolio, showToasts, useImpactConfig }

  const checkHealth = async () => {
    setHealthErr(null);
    try {
      const h = await api.health();
      setHealth(h);
    } catch (e) {
      setHealthErr(e.message);
    }
  };

  const refreshCredits = async () => {
    setCreditsErr(null);
    try {
      const c = await api.aiCredits();
      setCredits(c);
    } catch (e) {
      setCreditsErr(e.message);
    }
  };

  const loadGamPrefs = async () => {
    const [p, t, c] = await Promise.all([
      api.getPref('gamification.show_portfolio').catch(() => ({ value: null })),
      api.getPref('gamification.show_toasts').catch(() => ({ value: null })),
      api.getPref('gamification.show_impact_config').catch(() => ({ value: null })),
    ]);
    setGamPrefs({
      showPortfolio: p.value === null ? true : !!p.value,
      showToasts: t.value === null ? true : !!t.value,
      useImpactConfig: c.value === null ? false : !!c.value,
    });
  };

  const setGamPref = async (key, value) => {
    setGamPrefs((s) => ({ ...s, [key]: value }));
    const map = { showPortfolio: 'show_portfolio', showToasts: 'show_toasts', useImpactConfig: 'show_impact_config' };
    try {
      await api.setPref(`gamification.${map[key]}`, value);
      notifyGamificationChanged();
    } catch (e) {
      toast.error('Не удалось сохранить: ' + e.message);
    }
  };

  useEffect(() => {
    checkHealth();
    refreshCredits();
    loadGamPrefs();
    api.listSites().then(setSites).catch(() => {});
    // дёрнем dummy AI command — заглушка ответит stub:true, реальный ключ — stub:false
    api.aiCommand('ping', {}).then((r) => setAiStatus(r)).catch((e) => setAiStatus({ error: e.message }));
  }, []);

  const saveToken = () => {
    saveAuthToken(token);
    sessionStorage.removeItem('scc:auth-dismissed');
    toast.success(token ? 'Токен сохранён. Перезагрузка...' : 'Токен удалён. Перезагрузка...');
    setTimeout(() => window.location.reload(), 600);
  };

  const sitesWithWp = sites.filter((s) => s.wpHasCreds).length;
  const integrations = [
    {
      name: 'Express API',
      ok: !!health,
      detail: health ? `online · sites: ${health.sites}` : healthErr || '...',
    },
    {
      name: 'AI',
      ok: health?.integrations?.ai?.configured,
      warn: !health?.integrations?.ai?.configured,
      detail: health?.integrations?.ai?.configured
        ? `${health.integrations.ai.provider} · ${health.integrations.ai.model}`
        : health?.integrations?.ai
          ? `${health.integrations.ai.provider}: ключ не задан в .env`
          : '...',
    },
    {
      name: 'WordPress REST',
      ok: sitesWithWp > 0,
      warn: sitesWithWp === 0,
      detail: sitesWithWp > 0 ? `${sitesWithWp} of ${sites.length} sites configured` : 'настраивается per-site (WP Application Password)',
    },
    {
      name: 'GA4 Data API',
      ok: !!health?.integrations?.ga4?.configured,
      warn: !health?.integrations?.ga4?.configured,
      detail: health?.integrations?.ga4?.configured
        ? `online · source: ${health.integrations.ga4.source}`
        : 'требует GOOGLE_APPLICATION_CREDENTIALS (service account)',
    },
    {
      name: 'Search Console',
      ok: !!health?.integrations?.gsc?.configured,
      warn: !health?.integrations?.gsc?.configured,
      detail: health?.integrations?.gsc?.configured
        ? `online · source: ${health.integrations.gsc.source}`
        : 'требует GOOGLE_APPLICATION_CREDENTIALS (service account)',
    },
    {
      name: 'n8n webhooks',
      ok: !!health?.integrations?.n8n,
      warn: !health?.integrations?.n8n,
      detail: health?.integrations?.n8n ? 'configured (N8N_WEBHOOK_BASE set)' : 'требует N8N_WEBHOOK_BASE в .env',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '900px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>⚙️ Settings</h1>

      <Card title="Авторизация">
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px' }}>
          Bearer-токен для API. Если на сервере <code style={{ color: '#60a5fa' }}>AUTH_TOKEN</code> пустой —
          оставьте пустым (dev-режим). Хранится в <code style={{ color: '#60a5fa' }}>localStorage</code>.
        </p>
        <div style={{ display: 'flex', gap: '6px' }}>
          <Inp value={token} onChange={setTokenInput} placeholder="Bearer token" type="password" sx={{ flex: 1, fontFamily: 'var(--mn)' }} />
          <Btn v="acc" onClick={saveToken}>💾 Сохранить</Btn>
        </div>
      </Card>

      <Card title="Состояние интеграций">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {!health && !healthErr && (
            <>
              {[0,1,2,3,4,5].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#0f172a', borderRadius: '5px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Skeleton w={8} h={8} sx={{ borderRadius: '50%' }} />
                    <Skeleton w={120} h={12} />
                  </div>
                  <Skeleton w={180} h={10} />
                </div>
              ))}
            </>
          )}
          {(health || healthErr) && integrations.map((i) => (
            <div key={i.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#0f172a', borderRadius: '5px', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: i.ok ? '#34d399' : i.warn ? '#fbbf24' : '#ef4444' }} />
                <span style={{ fontSize: '12px', fontWeight: 700 }}>{i.name}</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--mn)' }}>{i.detail}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '10px' }}>
          <Btn onClick={checkHealth} sx={{ fontSize: '11px' }}>🔄 Перепроверить</Btn>
        </div>
      </Card>

      <Card title="🎮 Гамификация / мотивация">
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 10px' }}>
          Phase A — Live Portfolio Value в шапке + toast «+$X к капитализации» после действий.
          Цифры реальные (берём из Site Valuation), <b>заниженные</b>, не выдуманные.
          Скрытие = только UI; backend всегда продолжает считать в фоне.
        </p>
        {!gamPrefs ? <Skeleton w={300} h={70} /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Toggle
              checked={gamPrefs.showPortfolio}
              onChange={(v) => setGamPref('showPortfolio', v)}
              label="💎 Портфель в шапке"
              hint="Pill с текущей капитализацией и дельтой за 24ч/30д. Можно скрыть прямо в шапке (👁), сюда дублируется."
            />
            <Toggle
              checked={gamPrefs.showToasts}
              onChange={(v) => setGamPref('showToasts', v)}
              label="🎉 Toast «+$X к капитализации» после публикации/обновления статьи"
              hint="Показывает предсказанное влияние на оценку (review +$15, comparison +$25, guide +$10 — те же значения что в формуле валюации)."
            />
            <Toggle
              checked={gamPrefs.useImpactConfig}
              onChange={(v) => setGamPref('useImpactConfig', v)}
              label="🛠 Кастомные значения impact (Phase B — пока не реализовано)"
              hint="В будущем сюда добавится таблица «action → impact $», чтобы редактировать самому."
              disabled
            />
          </div>
        )}
      </Card>

      <Card title="AI-бюджет (OpenRouter)">
        {!credits && !creditsErr && <Skeleton w={260} h={24} />}
        {creditsErr && (
          <div style={{ fontSize: '12px', color: '#ef4444' }}>Ошибка: {creditsErr}</div>
        )}
        {credits && !credits.configured && (
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            OPENROUTER_API_KEY не задан в .env — пропуск.
          </div>
        )}
        {credits && credits.configured && credits.error && (
          <div style={{ fontSize: '12px', color: '#fbbf24' }}>API вернул ошибку: {credits.error}</div>
        )}
        {credits && credits.configured && !credits.error && (() => {
          const pct = credits.total > 0 ? (credits.remaining / credits.total) * 100 : 0;
          const color = pct < 10 ? '#ef4444' : pct < 30 ? '#fbbf24' : '#34d399';
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', fontFamily: 'var(--mn)' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color }}>
                  ${credits.remaining.toFixed(2)}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  остаток · из ${credits.total.toFixed(2)} (использовано ${credits.used.toFixed(2)})
                </span>
              </div>
              <div style={{ height: '6px', background: '#0a0e17', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', background: color, transition: 'width .3s' }} />
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {pct < 10 && '⚠️ Меньше 10% — пополните, иначе агенты и AI-команды упадут.'}
                {pct >= 10 && pct < 30 && '🟡 Менее 30% — стоит подумать о пополнении.'}
                {pct >= 30 && '🟢 Ресурса достаточно.'}
              </div>
            </div>
          );
        })()}
        <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
          <Btn onClick={refreshCredits} sx={{ fontSize: '11px' }}>🔄 Обновить</Btn>
          <a href="https://openrouter.ai/credits" target="_blank" rel="noreferrer"
             style={{ fontSize: '11px', color: '#60a5fa', alignSelf: 'center', textDecoration: 'none' }}>
            openrouter.ai/credits ↗
          </a>
        </div>
      </Card>

      <Card title={`Сайты в портфеле (${sites.length})`}>
        {!sites.length ? (
          <div style={{ fontSize: '12px', color: '#475569' }}>Нет сайтов — добавьте на <Link to="/" style={{ color: '#60a5fa' }}>Dashboard</Link>.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {sites.map((s) => (
              <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px', alignItems: 'center', padding: '8px 10px', background: '#0f172a', borderRadius: '5px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--mn)' }}>{s.name}</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{s.market} · {s.niche}</span>
                <Badge s={s.status} />
                <Link to={`/sites/${s.id}`} style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none', padding: '3px 8px', background: '#1e293b', borderRadius: '4px' }}>детали →</Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="📦 Версия SCC">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontFamily: 'var(--mn)' }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5 }}>Версия</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0', marginTop: 2 }}>v{APP_VERSION}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5 }}>Commit</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginTop: 2 }}>{APP_COMMIT}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: .5 }}>Сборка</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{buildInfoLines().date}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, fontSize: 11, color: '#64748b' }}>
          Собирается из <code style={{ color: '#60a5fa' }}>package.json</code> + <code style={{ color: '#60a5fa' }}>git rev-parse HEAD</code> во время <code style={{ color: '#60a5fa' }}>vite build</code>.
          При каждом деплое на прод число должно обновляться. Если нет — проверь что docker compose build прошёл и контейнер пересоздан.
        </div>
      </Card>

      <Card title="📖 Справка и документация">
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px' }}>
          Горячие клавиши — кнопка <code style={{ color: '#60a5fa' }}>?</code> в шапке или просто нажми «?». Остальное — в документах.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
          <HelpLink href="https://github.com/denisilyin75-ops/seo-dashbord/blob/main/CLAUDE.md" icon="📋" title="CLAUDE.md"
            desc="Спецификация SCC — что за проект, стек, архитектура, принципы разработки" />
          <HelpLink href="https://github.com/denisilyin75-ops/seo-dashbord/blob/main/docs/business-model.md" icon="🚀" title="Business model"
            desc="Product vision, 4 персоны, монетизация (5 слоёв), longevity, adjacent fruit principle" />
          <HelpLink href="https://github.com/denisilyin75-ops/seo-dashbord/blob/main/docs/scaling-checklist.md" icon="📐" title="Scaling checklist"
            desc="Чек-лист запуска нового сайта от 0 до боевого за 30-60 мин + таблица известных гвоздей" />
          <HelpLink href="https://github.com/denisilyin75-ops/seo-dashbord/blob/main/docs/gamification.md" icon="💎" title="Gamification Phase A"
            desc="Откуда цифры в шапке, что такое zombie-tier, как настроить toggle'ы" />
          <HelpLink href="https://github.com/denisilyin75-ops/seo-dashbord/blob/main/docs/backlog.md" icon="📋" title="Backlog"
            desc="P0/P1/P2/P3 задачи, очерёдность на ближайшую сессию. Живой документ" />
          <HelpLink href="https://github.com/denisilyin75-ops/seo-dashbord/blob/main/docs/devlog.md" icon="📔" title="Devlog"
            desc="Хронология значимых изменений и решений — «как мы дошли до этого»" />
          <HelpLink href="https://github.com/denisilyin75-ops/seo-dashbord/tree/main/docs/strategies" icon="📚" title="Стратегии рубрик"
            desc="coffee-machines, cleaning, kettles, vacuum-robots — по рубрикам" />
          <HelpLink href="https://github.com/denisilyin75-ops/seo-dashbord" icon="🐙" title="Репозиторий"
            desc="Исходники, issues, commit log" />
        </div>
      </Card>

      <Card title="🗑 Сброс кеша">
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 10px' }}>
          Если UI ведёт себя странно (старые данные, не те настройки, виджеты «застряли») — попробуй по возрастанию силы.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <CacheAction
            level="soft"
            title="🔄 Перезагрузить страницу (hard refresh)"
            desc="Убирает кеш браузера для этой страницы — Ctrl+Shift+R / Cmd+Shift+R. Безопасно. localStorage не трогает."
            onClick={() => window.location.reload()}
            btn="Перезагрузить"
          />
          <CacheAction
            level="medium"
            title="🧹 Очистить пользовательские настройки (localStorage)"
            desc="Сбросит фильтры дашборда, selected-сайт, состояние скроллов, любые UX-prefs в браузере. Auth-токен и серверные user_prefs НЕ трогает."
            onClick={() => {
              const keys = Object.keys(localStorage).filter((k) => k.startsWith('scc:') && k !== 'scc:auth-token');
              keys.forEach((k) => localStorage.removeItem(k));
              sessionStorage.clear();
              toast.success(`Очищено ${keys.length} ключей · перезагрузка...`);
              setTimeout(() => window.location.reload(), 500);
            }}
            btn="Очистить"
          />
          <CacheAction
            level="hard"
            title="🗃 Полный выход (сбросить auth-токен + всё)"
            desc="Выход из SCC + очистка ВСЕГО localStorage. После — придётся заново ввести токен на логине. Серверные данные (сайты, статьи, оценки) НЕ трогаются."
            onClick={async () => {
              const ok = window.confirm('Полный выход: очистим всё включая auth-токен. Продолжить?');
              if (!ok) return;
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/';
            }}
            btn="Сбросить всё"
            danger
          />
        </div>
        <div style={{ marginTop: 12, fontSize: 10, color: '#64748b', padding: 8, background: '#0a0e17', borderRadius: 4, border: '1px solid #1e293b' }}>
          <b>Серверные кеши</b>: daily_briefs перезаписываются раз в день (там уникальный ключ <code style={{ color: '#94a3b8' }}>siteId+date</code>); Site Valuation пересчитывается через <code style={{ color: '#94a3b8' }}>▶ Пересчитать</code> на SiteDetail → Капитализация; Portfolio Widget читает последнюю запись из site_valuations — чтобы обновить цифру, запусти пересчёт агента site_valuation.
        </div>
      </Card>

      <Card title="Переменные окружения (.env)">
        <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 8px' }}>
          Серверные секреты задаются в <code style={{ color: '#60a5fa' }}>.env</code> на хосте. UI их не редактирует.
        </p>
        <pre style={{ background: '#0a0e17', padding: '10px', borderRadius: '5px', fontSize: '11px', color: '#94a3b8', overflowX: 'auto', margin: 0, fontFamily: 'var(--mn)' }}>
{`PORT=3001
AUTH_TOKEN=                     # пусто = без авторизации
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_APPLICATION_CREDENTIALS=./google-sa-key.json
N8N_WEBHOOK_BASE=https://n8n.your-server.com/webhook
DB_PATH=./data/seo.sqlite`}
        </pre>
      </Card>
    </div>
  );
}

function HelpLink({ href, icon, title, desc }) {
  return (
    <a
      href={href} target="_blank" rel="noreferrer"
      style={{
        background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 5,
        padding: '10px 12px', textDecoration: 'none', color: 'inherit',
        display: 'flex', flexDirection: 'column', gap: 4,
        transition: 'border-color .15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{title}</span>
        <span style={{ fontSize: 9, color: '#60a5fa', marginLeft: 'auto' }}>↗</span>
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>{desc}</div>
    </a>
  );
}

function CacheAction({ level, title, desc, onClick, btn, danger }) {
  const levelColors = { soft: '#3b82f6', medium: '#fbbf24', hard: '#ef4444' };
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px',
      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 5,
      borderLeft: `3px solid ${levelColors[level]}`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.4 }}>{desc}</div>
      </div>
      <Btn
        onClick={onClick}
        v={danger ? 'danger' : 'ghost'}
        sx={{ fontSize: 11, whiteSpace: 'nowrap', alignSelf: 'center' }}
      >{btn}</Btn>
    </div>
  );
}

function Toggle({ checked, onChange, label, hint, disabled }) {
  return (
    <label style={{
      display: 'flex', gap: 10, alignItems: 'flex-start', cursor: disabled ? 'not-allowed' : 'pointer',
      padding: '8px 10px', background: '#0f172a', borderRadius: 5, border: '1px solid #1e293b',
      opacity: disabled ? 0.55 : 1,
    }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        style={{ marginTop: 2, accentColor: '#3b82f6', cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{label}</span>
        {hint && <span style={{ fontSize: 10, color: '#64748b' }}>{hint}</span>}
      </div>
    </label>
  );
}

function Card({ title, children }) {
  return (
    <section style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
      <h2 style={{ fontSize: '13px', fontWeight: 800, margin: '0 0 10px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.5px' }}>{title}</h2>
      {children}
    </section>
  );
}
