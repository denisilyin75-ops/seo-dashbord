import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { Badge, Btn, Metric, Modal, XLink } from '../components/ui.jsx';
import { TI, PC } from '../utils/constants.js';
import { d2s } from '../utils/format.js';
import ArticleRow from '../components/ArticleRow.jsx';
import AIPanel from '../components/AIPanel.jsx';
import LogPanel from '../components/LogPanel.jsx';
import DeploysPanel from '../components/DeploysPanel.jsx';
import AddForm from '../components/AddForm.jsx';
import SiteForm from '../components/SiteForm.jsx';
import DeployWizard from '../components/DeployWizard.jsx';

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
  const [err, setErr] = useState(null);

  const loadBase = useCallback(async () => {
    try {
      const [s, d, l] = await Promise.all([api.listSites(), api.listDeploys(), api.listLog({ limit: 50 })]);
      setSites(s); setDeploys(d); setLog(l);
      setSel((prev) => prev || s[0]?.id || null);
      setLoading(false);
    } catch (e) {
      setErr(e.message); setLoading(false);
    }
  }, []);

  const loadSiteData = useCallback(async (siteId) => {
    if (!siteId) { setArticles([]); setPlan([]); return; }
    try {
      const [a, p] = await Promise.all([api.listArticles(siteId), api.listPlan(siteId)]);
      setArticles(a); setPlan(p);
    } catch (e) {
      setErr(e.message);
    }
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => { loadSiteData(sel); }, [sel, loadSiteData]);

  const refreshLog = async () => { try { setLog(await api.listLog({ limit: 50 })); } catch {} };

  // Article handlers
  const updArt = async (u) => { await api.updateArticle(u.id, u); await loadSiteData(sel); refreshLog(); };
  const delArt = async (id) => { await api.deleteArticle(id); await loadSiteData(sel); };
  const addArt = async (a) => { await api.createArticle(sel, a); await loadSiteData(sel); };
  // Plan handlers
  const addPl = async (p) => { await api.createPlan(sel, p); await loadSiteData(sel); };
  const delPl = async (id) => { await api.deletePlan(id); await loadSiteData(sel); };
  // Site handlers
  const addSite = async (s) => { const created = await api.createSite(s); await loadBase(); setSel(created.id); };
  const updSite = async (s) => { await api.updateSite(s.id, s); await loadBase(); };
  const onDeployed = async (newSite) => { await loadBase(); setSel(newSite.id); };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#475569', fontFamily: 'var(--mn)' }}>⏳ Загрузка...</div>;
  }
  if (err) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>⚠️ {err}</div>;
  }

  const sA = articles;
  const sP = plan;
  const cur = sites.find((s) => s.id === sel);

  const tabs = [
    { id: 'articles', l: 'Статьи',  ic: '📄', n: sA.length },
    { id: 'plan',     l: 'План',    ic: '📋', n: sP.length },
    { id: 'ai',       l: 'AI',      ic: '🤖' },
    { id: 'deploys',  l: 'Деплои',  ic: '🚀', n: deploys.length },
    { id: 'log',      l: 'Лог',     ic: '📜', n: log.length },
  ];

  return (
    <div style={{ background: '#0a0e17', color: '#e2e8f0', minHeight: '100vh', padding: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>☕</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-.3px' }}>SEO Command Center</div>
            <div style={{ fontSize: '9px', color: '#475569', fontFamily: 'var(--mn)' }}>v0.1 · phase 1 · api</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Btn onClick={() => setShowDeploy(true)} v="success" sx={{ fontSize: '11px', padding: '5px 12px' }}>🚀 Deploy</Btn>
          <div style={{ padding: '3px 8px', borderRadius: '4px', background: '#1e293b', fontSize: '10px', fontFamily: 'var(--mn)', color: '#64748b' }}>
            {new Date().toLocaleDateString('ru-RU')}
          </div>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d39944' }} />
        </div>
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
              style={{ background: isSel ? '#3b82f608' : '#0f172a', borderRadius: '7px', padding: '12px', border: isSel ? '2px solid #3b82f6' : '2px solid #1e293b', cursor: 'pointer', flex: 1, minWidth: '240px', transition: 'all .2s' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, fontFamily: 'var(--mn)', color: '#e2e8f0' }}>{site.name}</span>
                  <span style={{ fontSize: '9px', color: '#64748b', background: '#1e293b', padding: '1px 4px', borderRadius: '3px' }}>{site.market}</span>
                </div>
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                  <Badge s={site.status} />
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
              <span style={{ fontSize: '11px', color: '#64748b' }}>{sA.length} · {cur?.name}</span>
              <Btn onClick={() => setModal('addArticle')} v="acc" sx={{ fontSize: '10px' }}>＋ Статья</Btn>
            </div>
            {sA.map((a) => <ArticleRow key={a.id} article={a} onUpdate={updArt} onDelete={delArt} />)}
            {!sA.length && <div style={{ padding: '30px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>Нет статей</div>}
          </div>
        )}

        {tab === 'plan' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>План · {cur?.name}</span>
              <Btn onClick={() => setModal('addPlan')} v="acc" sx={{ fontSize: '10px' }}>＋</Btn>
            </div>
            {sP.map((p) => (
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
            {!sP.length && <div style={{ padding: '30px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>Пусто</div>}
          </div>
        )}

        {tab === 'ai' && <AIPanel siteId={sel} />}
        {tab === 'deploys' && <DeploysPanel deploys={deploys} />}
        {tab === 'log' && <LogPanel log={log} />}
      </div>

      {/* Stack status */}
      <div style={{ marginTop: '16px', padding: '10px', background: '#0f172a', borderRadius: '6px', border: '1px solid #1e293b' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '.8px' }}>Stack</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[{ n: 'Express', s: 1 }, { n: 'SQLite', s: 1 }, { n: 'Claude API', s: 0 }, { n: 'WP REST', s: 0 }, { n: 'GA4', s: 0 }, { n: 'GSC', s: 0 }, { n: 'n8n', s: 0 }].map((i) => (
            <div key={i.n} style={{ padding: '4px 8px', background: '#1e293b', borderRadius: '3px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: i.s ? '#34d399' : '#fbbf24' }} />
              <span style={{ fontWeight: 700, color: '#cbd5e1' }}>{i.n}</span>
            </div>
          ))}
        </div>
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
          onDeployed={async (newSite) => { await onDeployed(newSite); }}
          onClose={() => { setShowDeploy(false); loadBase(); }}
        />
      )}
    </div>
  );
}
