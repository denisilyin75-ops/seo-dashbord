import { useEffect, useState, useCallback } from 'react';
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
import { useTryToast } from '../components/Toast.jsx';

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
  const tryToast = useTryToast();

  const loadBase = useCallback(async () => {
    const [s, d, l] = await Promise.all([api.listSites(), api.listDeploys(), api.listLog({ limit: 50 })]);
    setSites(s); setDeploys(d); setLog(l);
    setSel((prev) => prev || s[0]?.id || null);
    setLoading(false);
  }, []);

  const loadSiteData = useCallback(async (siteId) => {
    if (!siteId) { setArticles([]); setPlan([]); return; }
    const [a, p] = await Promise.all([api.listArticles(siteId), api.listPlan(siteId)]);
    setArticles(a); setPlan(p);
  }, []);

  useEffect(() => { tryToast(loadBase, { error: (e) => `Не удалось загрузить данные: ${e.message}` }); }, [loadBase, tryToast]);
  useEffect(() => { if (sel) loadSiteData(sel).catch(() => {}); }, [sel, loadSiteData]);

  const refreshLog = async () => { try { setLog(await api.listLog({ limit: 50 })); } catch {} };

  // Article handlers
  const updArt = (u)  => tryToast(async () => { await api.updateArticle(u.id, u); await loadSiteData(sel); refreshLog(); }, { success: 'Сохранено' });
  const delArt = (id) => tryToast(async () => { await api.deleteArticle(id); await loadSiteData(sel); }, { success: 'Удалено' });
  const addArt = (a)  => tryToast(async () => { await api.createArticle(sel, a); await loadSiteData(sel); }, { success: 'Создано' });
  const addPl  = (p)  => tryToast(async () => { await api.createPlan(sel, p); await loadSiteData(sel); }, { success: 'В план' });
  const delPl  = (id) => tryToast(async () => { await api.deletePlan(id); await loadSiteData(sel); }, { success: 'Удалено' });
  const addSite = (s) => tryToast(async () => { const c = await api.createSite(s); await loadBase(); setSel(c.id); }, { success: 'Сайт добавлен' });
  const updSite = (s) => tryToast(async () => { await api.updateSite(s.id, s); await loadBase(); }, { success: 'Сайт сохранён' });

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#475569', fontFamily: 'var(--mn)' }}>⏳ Загрузка...</div>;
  }

  const cur = sites.find((s) => s.id === sel);

  const tabs = [
    { id: 'articles', l: 'Статьи',  ic: '📄', n: articles.length },
    { id: 'plan',     l: 'План',    ic: '📋', n: plan.length },
    { id: 'ai',       l: 'AI',      ic: '🤖' },
    { id: 'deploys',  l: 'Деплои',  ic: '🚀', n: deploys.length },
    { id: 'log',      l: 'Лог',     ic: '📜', n: log.length },
  ];

  // Сводная статистика портфеля
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
          <span>Портфель: <b style={{ color: '#e2e8f0' }}>{sites.length}</b> сайтов</span>
          <span>Sessions: <b style={{ color: '#60a5fa', fontFamily: 'var(--mn)' }}>{fmt(totals.sessions)}</b></span>
          <span>Revenue: <b style={{ color: '#34d399', fontFamily: 'var(--mn)' }}>${fmt(totals.revenue)}</b></span>
          <span>Aff Clicks: <b style={{ color: '#fbbf24', fontFamily: 'var(--mn)' }}>{fmt(totals.clicks)}</b></span>
          <span>Sales: <b style={{ color: '#f97316', fontFamily: 'var(--mn)' }}>{totals.sales}</b></span>
        </div>
        <Btn onClick={() => setShowDeploy(true)} v="success" sx={{ fontSize: '11px', padding: '5px 12px' }}>🚀 Deploy new site</Btn>
      </div>

      {/* Site cards */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {sites.map((site) => {
          const isSel = sel === site.id;
          const m = site.metrics;
          return (
            <div
              key={site.id}
              onClick={() => setSel(site.id)}
              style={{ background: isSel ? '#3b82f608' : '#0f172a', borderRadius: '7px', padding: '12px', border: isSel ? '2px solid #3b82f6' : '2px solid #1e293b', cursor: 'pointer', flex: '1 1 240px', minWidth: '240px', transition: 'all .2s' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--mn)', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site.name}</span>
                  <span style={{ fontSize: '9px', color: '#64748b', background: '#1e293b', padding: '1px 4px', borderRadius: '3px' }}>{site.market}</span>
                </div>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                  <Badge s={site.status} />
                  <Link to={`/sites/${site.id}`} onClick={(e) => e.stopPropagation()} style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none', padding: '1px 6px', background: '#1e293b', borderRadius: '3px' }}>↗</Link>
                  <Btn onClick={(e) => { e.stopPropagation(); setModal({ t: 'editSite', site }); }} v="ghost" sx={{ fontSize: '11px', padding: '1px 3px' }}>✏️</Btn>
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
          style={{ background: '#0f172a', borderRadius: '7px', padding: '12px', border: '2px dashed #1e293b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '100px', color: '#475569', fontSize: '12px', fontWeight: 700 }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1e293b'}
        >＋</div>
      </div>

      {/* Tabs */}
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

      <div style={{ animation: 'fadeIn .3s ease' }}>
        {tab === 'articles' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>{articles.length} · {cur?.name}</span>
              <Btn onClick={() => setModal('addArticle')} v="acc" sx={{ fontSize: '10px' }}>＋ Статья</Btn>
            </div>
            {articles.map((a) => <ArticleRow key={a.id} article={a} onUpdate={updArt} onDelete={delArt} />)}
            {!articles.length && <div style={{ padding: '30px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>Нет статей</div>}
          </div>
        )}

        {tab === 'plan' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>План · {cur?.name}</span>
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

        {tab === 'ai' && <AIPanel siteId={sel} />}
        {tab === 'deploys' && <DeploysPanel deploys={deploys} />}
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
      {modal === 'addSite' && (
        <Modal title="🌐 Сайт" onClose={() => setModal(null)}>
          <SiteForm onSave={async (s) => { await addSite(s); setModal(null); }} />
        </Modal>
      )}
      {modal?.t === 'editSite' && (
        <Modal title="✏️ Сайт" onClose={() => setModal(null)}>
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
    </div>
  );
}
