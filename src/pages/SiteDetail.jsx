import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { Badge, Btn, Metric, Modal, XLink } from '../components/ui.jsx';
import { TI, PC } from '../utils/constants.js';
import ArticleRow from '../components/ArticleRow.jsx';
import AIPanel from '../components/AIPanel.jsx';
import LogPanel from '../components/LogPanel.jsx';
import AddForm from '../components/AddForm.jsx';
import SiteForm from '../components/SiteForm.jsx';
import MetricsChart from '../components/MetricsChart.jsx';
import { useToast, useTryToast } from '../components/Toast.jsx';

export default function SiteDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const tryToast = useTryToast();

  const [site, setSite] = useState(null);
  const [articles, setArticles] = useState([]);
  const [plan, setPlan] = useState([]);
  const [log, setLog] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [tab, setTab] = useState('articles');
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const periodTo   = new Date().toISOString().slice(0, 10);
  const periodFrom = new Date(Date.now() - 13 * 86400_000).toISOString().slice(0, 10);

  const load = useCallback(async () => {
    try {
      const sites = await api.listSites();
      const s = sites.find((x) => x.id === id);
      if (!s) { setErr('Сайт не найден'); setLoading(false); return; }
      setSite(s);
      const [a, p, l, m] = await Promise.all([
        api.listArticles(id),
        api.listPlan(id),
        api.listLog({ siteId: id, limit: 30 }),
        api.siteMetrics(id, { from: periodFrom, to: periodTo, fill: 1 }),
      ]);
      setArticles(a); setPlan(p); setLog(l); setMetrics(m);
      setLoading(false);
    } catch (e) {
      setErr(e.message); setLoading(false);
    }
  }, [id, periodFrom, periodTo]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>⏳ Загрузка...</div>;
  if (err)     return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
      ⚠️ {err}<br/>
      <Link to="/" style={{ color: '#60a5fa', fontSize: '12px' }}>← На Dashboard</Link>
    </div>
  );

  const updArt = (u) => tryToast(async () => { await api.updateArticle(u.id, u); await load(); }, { success: 'Статья обновлена' });
  const delArt = (id) => tryToast(async () => { await api.deleteArticle(id); await load(); }, { success: 'Статья удалена' });
  const addArt = (a) => tryToast(async () => { await api.createArticle(id, a); await load(); }, { success: 'Статья создана' });
  const addPl  = (p) => tryToast(async () => { await api.createPlan(id, p); await load(); }, { success: 'Добавлено в план' });
  const delPl  = (pid) => tryToast(async () => { await api.deletePlan(pid); await load(); }, { success: 'Удалено из плана' });
  const updSite = (s) => tryToast(async () => { await api.updateSite(s.id, s); await load(); }, { success: 'Сайт сохранён' });
  const delSite = () => {
    if (!confirm(`Удалить сайт "${site.name}" со всеми статьями и планом?`)) return;
    tryToast(async () => { await api.deleteSite(id); nav('/'); }, { success: 'Сайт удалён' });
  };

  const m = site.metrics;
  const tabs = [
    { id: 'articles', l: 'Статьи',  ic: '📄', n: articles.length },
    { id: 'plan',     l: 'План',    ic: '📋', n: plan.length },
    { id: 'ai',       l: 'AI',      ic: '🤖' },
    { id: 'log',      l: 'Лог',     ic: '📜', n: log.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <Link to="/" style={{ fontSize: '11px', color: '#64748b', textDecoration: 'none' }}>← Dashboard</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, fontFamily: 'var(--mn)' }}>{site.name}</h1>
            <Badge s={site.status} />
            <span style={{ fontSize: '11px', color: '#64748b' }}>{site.market} · {site.niche}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <XLink href={site.wpAdmin}  label="WP Admin" icon="⚡" />
          <XLink href={site.ga4}       label="GA4"      icon="📈" />
          <XLink href={site.gsc}       label="GSC"      icon="🔍" />
          <XLink href={site.affiliate} label="Affiliate" icon="💰" />
          {site.wpHasCreds && (
            <Btn
              onClick={() => tryToast(
                async () => { const r = await api.syncAllWp(id); await load(); return r; },
                { success: (r) => `Синхронизировано из WP: ${r.synced} постов`, error: (e) => `WP sync: ${e.message}` },
              )}
              sx={{ fontSize: '11px' }}
            >↻ Sync WP</Btn>
          )}
          <Btn
            onClick={() => tryToast(
              async () => { const r = await api.syncSiteMetrics(id, 7); await load(); return r; },
              {
                success: (r) => `GA4: ${r.ga4.rows} rows, GSC: ${r.gsc.rows} rows, upserted ${r.upserted} дней` + (r.skipped.length ? ` · skipped: ${r.skipped.length}` : ''),
                error: (e) => `Sync metrics: ${e.message}`,
              },
            )}
            sx={{ fontSize: '11px' }}
          >📊 Pull GA4/GSC</Btn>
          <Btn onClick={() => setModal('editSite')} sx={{ fontSize: '11px' }}>✏️ Редактировать</Btn>
          <Btn onClick={delSite} v="danger" sx={{ fontSize: '11px' }}>🗑 Удалить</Btn>
        </div>
      </div>

      {/* Metrics */}
      <section style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.5px' }}>Метрики (последние 14 дней)</h2>
          <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'var(--mn)' }}>{periodFrom} → {periodTo}</span>
        </div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <Metric label="Sessions"  value={m.sessions} />
          <Metric label="Revenue"   value={m.revenue}         sfx="$" />
          <Metric label="Aff Clicks" value={m.affiliateClicks} />
          <Metric label="Sales"     value={m.sales} />
          <Metric label="RPM"       value={m.rpm}             sfx="$" />
          <Metric label="EPC"       value={m.epc}             sfx="$" />
          <Metric label="CTR"       value={m.ctr}             sfx="%" />
          <Metric label="CR"        value={m.cr}              sfx="%" />
        </div>
        <MetricsChart data={metrics} lines={['sessions', 'affiliate_clicks']} />
      </section>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid #1e293b', overflowX: 'auto' }}>
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

      <div style={{ animation: 'fadeIn .3s ease' }}>
        {tab === 'articles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{articles.length} статей</span>
              <Btn onClick={() => setModal('addArticle')} v="acc" sx={{ fontSize: '10px' }}>＋ Статья</Btn>
            </div>
            {articles.map((a) => <ArticleRow key={a.id} article={a} onUpdate={updArt} onDelete={delArt} />)}
            {!articles.length && <div style={{ padding: '30px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>Нет статей</div>}
          </div>
        )}

        {tab === 'plan' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>План</span>
              <Btn onClick={() => setModal('addPlan')} v="acc" sx={{ fontSize: '10px' }}>＋</Btn>
            </div>
            {plan.map((p) => (
              <div key={p.id} style={{ background: '#0f172a', borderRadius: '5px', padding: '8px 10px', border: '1px solid #1e293b', marginBottom: '3px', borderLeft: `3px solid ${PC[p.priority] || '#64748b'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{TI[p.type] || '📄'}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{p.title}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Badge s={p.status} />
                  <span style={{ fontSize: '9px', color: '#475569', fontFamily: 'var(--mn)' }}>{p.deadline}</span>
                  <Btn onClick={() => delPl(p.id)} v="ghost" sx={{ fontSize: '10px', color: '#ef4444' }}>✕</Btn>
                </div>
              </div>
            ))}
            {!plan.length && <div style={{ padding: '30px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>Пусто</div>}
          </div>
        )}

        {tab === 'ai' && <AIPanel siteId={id} />}
        {tab === 'log' && <LogPanel log={log} />}
      </div>

      {/* Modals */}
      {modal === 'addArticle' && (
        <Modal title="➕ Статья" onClose={() => setModal(null)}>
          <AddForm type="article" onAdd={async (a) => { await addArt(a); setModal(null); }} />
        </Modal>
      )}
      {modal === 'addPlan' && (
        <Modal title="📋 План" onClose={() => setModal(null)}>
          <AddForm type="plan" onAdd={async (p) => { await addPl(p); setModal(null); }} />
        </Modal>
      )}
      {modal === 'editSite' && (
        <Modal title="✏️ Сайт" onClose={() => setModal(null)}>
          <SiteForm site={site} onSave={async (s) => { await updSite(s); setModal(null); }} />
        </Modal>
      )}
    </div>
  );
}
