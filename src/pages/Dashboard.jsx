import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Badge, Btn, Metric, Modal, XLink } from '../components/ui.jsx';
import { TI, PC } from '../utils/constants.js';
import { fmt } from '../utils/format.js';
import ArticleRow from '../components/ArticleRow.jsx';
import AIPanel from '../components/AIPanel.jsx';
import LogPanel from '../components/LogPanel.jsx';
import DeploysPanel from '../components/DeploysPanel.jsx';
import AddForm from '../components/AddForm.jsx';
import SiteForm from '../components/SiteForm.jsx';
import DeployWizard from '../components/DeployWizard.jsx';
import DailyBrief from '../components/DailyBrief.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ScrollToTop from '../components/ScrollToTop.jsx';
import ContentPlanProgress from '../components/ContentPlanProgress.jsx';
import { SiteCardSkeleton, RowSkeleton } from '../components/Skeleton.jsx';
import { useTryToast } from '../components/Toast.jsx';
import { useConfirm } from '../components/ConfirmDialog.jsx';
import useHotkeys, { useDigitHotkey } from '../hooks/useHotkeys.js';
import { impactForCreate, impactForUpdate, buildToastSuffix } from '../utils/impact.js';
import { notifyGamificationChanged } from '../components/PortfolioWidget.jsx';

export default function Dashboard() {
  const [sites, setSites] = useState([]);
  const [articles, setArticles] = useState([]);
  const [plan, setPlan] = useState([]);
  const [log, setLog] = useState([]);
  const [deploys, setDeploys] = useState([]);
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState('articles');
  const [modal, setModal] = useState(null);
  const [showDeploy, setShowDeploy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingSite, setLoadingSite] = useState(false);
  const tryToast = useTryToast();
  const confirm = useConfirm();

  // Articles tab: поиск, фильтры, пагинация
  const [search, setSearch] = useState('');
  const [fStatus, setFStatus] = useState('all');      // all | published | draft | planned
  const [fType, setFType] = useState('all');          // all | review | comparison | guide | quiz | tool | category
  const [fFresh, setFFresh] = useState('all');        // all | green | yellow | orange | red
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  const loadBase = useCallback(async () => {
    const [s, d, l] = await Promise.all([api.listSites(), api.listDeploys(), api.listLog({ limit: 50 })]);
    setSites(s); setDeploys(d); setLog(l);
    setSel((prev) => prev || s[0]?.id || null);
    setLoading(false);
  }, []);

  const loadSiteData = useCallback(async (siteId) => {
    if (!siteId) { setArticles([]); setPlan([]); return; }
    setLoadingSite(true);
    try {
      const [a, p] = await Promise.all([api.listArticles(siteId), api.listPlan(siteId)]);
      setArticles(a); setPlan(p);
    } finally {
      setLoadingSite(false);
    }
  }, []);

  useEffect(() => { tryToast(loadBase, { error: (e) => `Не удалось загрузить данные: ${e.message}` }); }, [loadBase, tryToast]);
  useEffect(() => { if (sel) loadSiteData(sel).catch(() => {}); }, [sel, loadSiteData]);

  // Сброс пагинации/поиска при смене сайта или фильтра
  useEffect(() => { setPage(1); }, [sel, search, fStatus, fType, fFresh]);

  // Helper для freshness уровня (зеркалит RevisionsModal.freshnessLevel)
  const freshBucket = (iso) => {
    if (!iso) return 'none';
    const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
    const days = (Date.now() - d.getTime()) / 86400000;
    if (days < 30)  return 'green';
    if (days < 180) return 'yellow';
    if (days < 365) return 'orange';
    return 'red';
  };

  const filteredArticles = useMemo(() => {
    let arr = articles;
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((a) =>
        (a.title || '').toLowerCase().includes(q) ||
        (a.url || '').toLowerCase().includes(q)
      );
    }
    if (fStatus !== 'all') arr = arr.filter((a) => a.status === fStatus);
    if (fType !== 'all')   arr = arr.filter((a) => a.type === fType);
    if (fFresh !== 'all')  arr = arr.filter((a) => freshBucket(a.updated) === fFresh);
    return arr;
  }, [articles, search, fStatus, fType, fFresh]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / PAGE_SIZE));
  const paginated = filteredArticles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Hotkeys
  useHotkeys('n a', () => sel && setModal('addArticle'));
  useHotkeys('n p', () => sel && setModal('addPlan'));
  useHotkeys('n s', () => setModal('addSite'));
  useDigitHotkey((digit) => { const site = sites[digit - 1]; if (site) setSel(site.id); });
  useHotkeys('/', () => {
    if (tab !== 'ai') setTab('ai');
    setTimeout(() => document.dispatchEvent(new Event('scc:focus-ai')), 50);
  });

  const refreshLog = async () => { try { setLog(await api.listLog({ limit: 50 })); } catch {} };

  // Phase A гамификации: toggle на toast-суффиксы «💎 +$N». Backend считает всегда — это только UI.
  const [gamToasts, setGamToasts] = useState(true);
  useEffect(() => {
    const loadGam = () => api.getPref('gamification.show_toasts')
      .then((r) => setGamToasts(r.value === null ? true : !!r.value))
      .catch(() => {});
    loadGam();
    document.addEventListener('scc:gamification-changed', loadGam);
    return () => document.removeEventListener('scc:gamification-changed', loadGam);
  }, []);

  const updArt = (u)  => {
    const impact = impactForUpdate(u);
    return tryToast(async () => {
      await api.updateArticle(u.id, u);
      await loadSiteData(sel);
      refreshLog();
      notifyGamificationChanged();
    }, { success: `💾 Сохранено${buildToastSuffix(impact, gamToasts)}` });
  };
  const delArt = async (aid) => {
    const title = articles.find((a) => a.id === aid)?.title || 'статью';
    const ok = await confirm({ message: `Удалить "${title}"?`, okLabel: 'Удалить', danger: true });
    if (ok) tryToast(async () => { await api.deleteArticle(aid); await loadSiteData(sel); notifyGamificationChanged(); }, { success: 'Удалено' });
  };
  const addArt = (a)  => {
    const impact = impactForCreate(a);
    return tryToast(async () => {
      await api.createArticle(sel, a);
      await loadSiteData(sel);
      notifyGamificationChanged();
    }, { success: `✨ Создано${buildToastSuffix(impact, gamToasts)}` });
  };
  const addPl  = (p)  => tryToast(async () => { await api.createPlan(sel, p); await loadSiteData(sel); }, { success: 'В план' });
  const delPl  = async (pid) => {
    const ok = await confirm({ message: 'Удалить пункт плана?', okLabel: 'Удалить', danger: true });
    if (ok) tryToast(async () => { await api.deletePlan(pid); await loadSiteData(sel); }, { success: 'Удалено' });
  };
  const addSite = (s) => tryToast(async () => { const c = await api.createSite(s); await loadBase(); setSel(c.id); }, { success: 'Сайт добавлен' });
  const updSite = (s) => tryToast(async () => { await api.updateSite(s.id, s); await loadBase(); }, { success: 'Сайт сохранён' });

  const cur = sites.find((s) => s.id === sel);

  const tabs = [
    { id: 'articles', l: 'Статьи',  ic: '📄', n: articles.length },
    { id: 'plan',     l: 'План',    ic: '📋', n: plan.length },
    { id: 'ai',       l: 'AI',      ic: '🤖' },
    { id: 'deploys',  l: 'Деплои',  ic: '🚀', n: deploys.length },
    { id: 'log',      l: 'Лог',     ic: '📜', n: log.length },
  ];

  const totals = sites.reduce((acc, s) => {
    const m = s.metrics || {};
    acc.sessions += m.sessions || 0;
    acc.revenue  += m.revenue  || 0;
    acc.clicks   += m.affiliateClicks || 0;
    acc.sales    += m.sales || 0;
    return acc;
  }, { sessions: 0, revenue: 0, clicks: 0, sales: 0 });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11px', color: '#64748b' }}>
          <span>Портфель: <b style={{ color: '#e2e8f0' }}>{loading ? '…' : sites.length}</b> сайтов</span>
          <span>Sessions: <b style={{ color: '#60a5fa', fontFamily: 'var(--mn)' }}>{loading ? '—' : fmt(totals.sessions)}</b></span>
          <span>Revenue: <b style={{ color: '#34d399', fontFamily: 'var(--mn)' }}>{loading ? '—' : '$' + fmt(totals.revenue)}</b></span>
          <span>Aff Clicks: <b style={{ color: '#fbbf24', fontFamily: 'var(--mn)' }}>{loading ? '—' : fmt(totals.clicks)}</b></span>
          <span>Sales: <b style={{ color: '#f97316', fontFamily: 'var(--mn)' }}>{loading ? '—' : totals.sales}</b></span>
        </div>
        <Btn onClick={() => setShowDeploy(true)} v="success" sx={{ fontSize: '11px', padding: '5px 12px' }}>🚀 Deploy new site</Btn>
      </div>

      {/* Daily Brief — "На сегодня" 4 карточки для оператора */}
      {sel && <DailyBrief siteId={sel} />}

      {/* Site cards */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {loading ? (
          <>
            <SiteCardSkeleton />
            <SiteCardSkeleton />
            <SiteCardSkeleton />
          </>
        ) : (
          <>
            {sites.map((site, idx) => {
              const isSel = sel === site.id;
              const m = site.metrics;
              return (
                <div
                  key={site.id}
                  onClick={() => setSel(site.id)}
                  style={{ background: isSel ? '#3b82f608' : '#0f172a', borderRadius: '7px', padding: '12px', border: isSel ? '2px solid #3b82f6' : '2px solid #1e293b', cursor: 'pointer', flex: '1 1 240px', minWidth: '240px', transition: 'all .2s', position: 'relative' }}
                >
                  {idx < 9 && (
                    <span style={{ position: 'absolute', top: '6px', left: '-7px', background: '#1e293b', color: '#94a3b8', fontSize: '9px', fontWeight: 700, padding: '1px 4px', borderRadius: '3px', fontFamily: 'var(--mn)', border: '1px solid #334155' }} title={`Shortcut: ${idx + 1}`}>
                      {idx + 1}
                    </span>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--mn)', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site.name}</span>
                      <span style={{ fontSize: '9px', color: '#64748b', background: '#1e293b', padding: '1px 4px', borderRadius: '3px' }}>{site.market}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                      <Badge s={site.status} />
                      <Link to={`/sites/${site.id}`} onClick={(e) => e.stopPropagation()} title="Открыть детали" style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none', padding: '1px 6px', background: '#1e293b', borderRadius: '3px' }}>↗</Link>
                      <Btn onClick={(e) => { e.stopPropagation(); setModal({ t: 'editSite', site }); }} v="ghost" sx={{ fontSize: '11px', padding: '1px 3px' }} title="Редактировать">✏️</Btn>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <Metric label="Sessions" value={m.sessions} />
                    <Metric label="Revenue"  value={m.revenue} sfx="$" />
                    <Metric label="RPM"      value={m.rpm}     sfx="$" />
                    <Metric label="CR"       value={m.cr}      sfx="%" />
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <XLink href={site.wpAdmin}  label="WP"  icon="⚡" />
                    <XLink href={site.ga4}       label="GA4" icon="📈" />
                    <XLink href={site.gsc}       label="GSC" icon="🔍" />
                    <XLink href={site.affiliate} label="Aff" icon="💰" />
                  </div>
                </div>
              );
            })}
            <div
              onClick={() => setModal('addSite')}
              title="N S"
              style={{ background: '#0f172a', borderRadius: '7px', padding: '12px', border: '2px dashed #1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '100px', color: '#475569', fontSize: '12px', fontWeight: 700 }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1e293b'}
            >＋</div>
          </>
        )}
      </div>

      {!loading && sites.length === 0 && (
        <EmptyState
          icon="🌐"
          title="Нет сайтов в портфеле"
          description="Добавьте существующий сайт (popolkam.ru, etc.) или разверните новый с AI-планом за 5 минут через Deploy Wizard."
          actions={
            <>
              <Btn v="acc" onClick={() => setModal('addSite')}>＋ Добавить сайт</Btn>
              <Btn v="success" onClick={() => setShowDeploy(true)}>🚀 Deploy Wizard</Btn>
            </>
          }
          sx={{ marginBottom: '12px' }}
        />
      )}

      {/* Tabs */}
      {sel && (
        <div style={{ display: 'flex', gap: '2px', marginBottom: '10px', borderBottom: '1px solid #1e293b', overflowX: 'auto' }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ background: tab === t.id ? '#0f172a' : 'transparent', border: tab === t.id ? '1px solid #1e293b' : '1px solid transparent', borderBottom: tab === t.id ? '1px solid #0f172a' : 'none', borderRadius: '5px 5px 0 0', padding: '6px 12px', marginBottom: '-1px', color: tab === t.id ? '#60a5fa' : '#64748b', fontSize: '11px', fontWeight: tab === t.id ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
            >
              <span>{t.ic}</span>{t.l}
              {t.n != null && (
                <span style={{ background: tab === t.id ? '#3b82f615' : '#1e293b', color: tab === t.id ? '#60a5fa' : '#64748b', padding: '0 4px', borderRadius: '8px', fontSize: '9px', fontFamily: 'var(--mn)' }}>{t.n}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {sel && (
        <div style={{ animation: 'fadeIn .3s ease' }}>
          {tab === 'articles' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  {filteredArticles.length === articles.length
                    ? `${articles.length} статей · ${cur?.name}`
                    : `${filteredArticles.length} / ${articles.length} · ${cur?.name}`}
                </span>
                <Btn onClick={() => setModal('addArticle')} v="acc" sx={{ fontSize: '10px' }}>＋ Статья <kbd style={{ marginLeft: 4 }}>N A</kbd></Btn>
              </div>

              {/* Панель поиска и фильтров */}
              {articles.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10, padding: 8, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6 }}>
                  <input
                    type="text"
                    placeholder="Поиск по заголовку или URL..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ flex: '1 1 200px', minWidth: 180, background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4, padding: '6px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none' }}
                  />
                  <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} style={{ background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4, padding: '6px 8px', color: '#e2e8f0', fontSize: 11 }}>
                    <option value="all">Статус: все</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="planned">Planned</option>
                  </select>
                  <select value={fType} onChange={(e) => setFType(e.target.value)} style={{ background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4, padding: '6px 8px', color: '#e2e8f0', fontSize: 11 }}>
                    <option value="all">Тип: все</option>
                    <option value="review">📋 Review</option>
                    <option value="comparison">⚖️ Comparison</option>
                    <option value="guide">📖 Guide</option>
                    <option value="quiz">🎯 Quiz</option>
                    <option value="tool">🔧 Tool</option>
                    <option value="category">📁 Category</option>
                  </select>
                  <select value={fFresh} onChange={(e) => setFFresh(e.target.value)} style={{ background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4, padding: '6px 8px', color: '#e2e8f0', fontSize: 11 }}>
                    <option value="all">Свежесть: все</option>
                    <option value="green">🟢 &lt;30д</option>
                    <option value="yellow">🟡 1-6мес</option>
                    <option value="orange">🟠 6-12мес</option>
                    <option value="red">🔴 &gt;12мес</option>
                  </select>
                  {(search || fStatus !== 'all' || fType !== 'all' || fFresh !== 'all') && (
                    <Btn onClick={() => { setSearch(''); setFStatus('all'); setFType('all'); setFFresh('all'); }} v="ghost" sx={{ fontSize: 10 }}>сбросить</Btn>
                  )}
                </div>
              )}

              {loadingSite ? (
                <>
                  <RowSkeleton /><RowSkeleton /><RowSkeleton />
                </>
              ) : filteredArticles.length ? (
                <>
                  {paginated.map((a) => <ArticleRow key={a.id} article={a} onUpdate={updArt} onDelete={delArt} />)}

                  {/* Пагинация */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 12, padding: 8 }}>
                      <Btn onClick={() => setPage(1)} disabled={page === 1} v="ghost" sx={{ fontSize: 11 }}>«</Btn>
                      <Btn onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} v="ghost" sx={{ fontSize: 11 }}>‹</Btn>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'var(--mn)', padding: '0 10px' }}>
                        стр. {page} / {totalPages}
                      </span>
                      <Btn onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} v="ghost" sx={{ fontSize: 11 }}>›</Btn>
                      <Btn onClick={() => setPage(totalPages)} disabled={page === totalPages} v="ghost" sx={{ fontSize: 11 }}>»</Btn>
                    </div>
                  )}
                </>
              ) : articles.length > 0 ? (
                <EmptyState
                  icon="🔍"
                  title="Ничего не найдено"
                  description="Попробуй изменить фильтры или поисковый запрос"
                  actions={<Btn v="ghost" onClick={() => { setSearch(''); setFStatus('all'); setFType('all'); setFFresh('all'); }}>Сбросить фильтры</Btn>}
                />
              ) : (
                <EmptyState
                  icon="📄"
                  title="Нет статей"
                  description={`На сайте ${cur?.name} ещё нет статей в БД дашборда. Добавьте вручную или импортируйте из WordPress.`}
                  actions={<Btn v="acc" onClick={() => setModal('addArticle')}>＋ Первая статья</Btn>}
                />
              )}
            </div>
          )}

          {tab === 'plan' && (
            <div>
              <ContentPlanProgress siteId={sel} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>План · {cur?.name}</span>
                <Btn onClick={() => setModal('addPlan')} v="acc" sx={{ fontSize: '10px' }}>＋ <kbd style={{ marginLeft: 4 }}>N P</kbd></Btn>
              </div>
              {loadingSite ? (
                <><RowSkeleton /><RowSkeleton /></>
              ) : plan.length ? (
                plan.map((p) => (
                  <div key={p.id} style={{ background: '#0f172a', borderRadius: '5px', padding: '8px 10px', border: '1px solid #1e293b', marginBottom: '3px', borderLeft: `3px solid ${PC[p.priority] || '#64748b'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{TI[p.type] || '📄'}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{p.title}</span>
                      {p.aiBrief && <span title="AI-бриф готов" style={{ fontSize: '10px' }}>✨</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <Badge s={p.status} />
                      <span style={{ fontSize: '9px', color: '#475569', fontFamily: 'var(--mn)' }}>{p.deadline}</span>
                      <Btn
                        onClick={() => tryToast(async () => {
                          const r = await api.generateBrief(p.id);
                          await loadSiteData(sel);
                          refreshLog();
                          if (r.stub) throw new Error('AI не настроен — см. .env сервера');
                        }, { success: p.aiBrief ? 'Бриф пересгенерирован' : 'Бриф готов ✨' })}
                        v="ghost"
                        sx={{ fontSize: '10px', color: p.aiBrief ? '#94a3b8' : '#60a5fa' }}
                        title={p.aiBrief ? 'Пересгенерировать бриф' : 'Сгенерировать AI-бриф'}
                      >
                        {p.aiBrief ? '↻' : 'AI'}
                      </Btn>
                      <Btn onClick={() => delPl(p.id)} v="ghost" sx={{ fontSize: '10px', color: '#ef4444' }}>✕</Btn>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon="📋"
                  title="План пуст"
                  description="Добавьте идеи статей с приоритетом и дедлайнами или попросите AI сгенерировать список."
                  actions={
                    <>
                      <Btn v="acc" onClick={() => setModal('addPlan')}>＋ В план</Btn>
                      <Btn onClick={() => { setTab('ai'); setTimeout(() => document.dispatchEvent(new Event('scc:focus-ai')), 50); }}>🤖 Спросить AI</Btn>
                    </>
                  }
                />
              )}
            </div>
          )}

          {tab === 'ai' && <AIPanel siteId={sel} />}
          {tab === 'deploys' && (deploys.length ? <DeploysPanel deploys={deploys} /> : (
            <EmptyState
              icon="🚀"
              title="Нет развёртываний"
              description="Deploy Wizard разворачивает новый WordPress-сайт с AI-планом структуры и первыми статьями за 5 минут."
              actions={<Btn v="success" onClick={() => setShowDeploy(true)}>🚀 Запустить Wizard</Btn>}
            />
          ))}
          {tab === 'log' && (log.length ? <LogPanel log={log} /> : (
            <EmptyState icon="📜" title="AI-лог пуст" description="Все команды Claude будут сохраняться здесь." />
          ))}
        </div>
      )}

      {/* Modals */}
      {modal === 'addArticle' && (
        <Modal title="➕ Новая статья" onClose={() => setModal(null)}>
          <AddForm type="article" onAdd={async (a) => { await addArt(a); setModal(null); }} />
        </Modal>
      )}
      {modal === 'addPlan' && (
        <Modal title="📋 Новый пункт плана" onClose={() => setModal(null)}>
          <AddForm type="plan" onAdd={async (p) => { await addPl(p); setModal(null); }} />
        </Modal>
      )}
      {modal === 'addSite' && (
        <Modal title="🌐 Новый сайт" onClose={() => setModal(null)}>
          <SiteForm onSave={async (s) => { await addSite(s); setModal(null); }} />
        </Modal>
      )}
      {modal?.t === 'editSite' && (
        <Modal title={`✏️ ${modal.site.name}`} onClose={() => setModal(null)}>
          <SiteForm site={modal.site} onSave={async (s) => { await updSite(s); setModal(null); }} />
        </Modal>
      )}

      {showDeploy && (
        <DeployWizard
          sites={sites}
          onDeployed={async () => { await loadBase(); }}
          onClose={() => { setShowDeploy(false); loadBase(); }}
        />
      )}

      <ScrollToTop />
    </div>
  );
}
