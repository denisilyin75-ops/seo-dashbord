import { useState } from 'react';
import { Btn, Inp, Modal, Sel, XLink } from './ui.jsx';
import { TI, PC } from '../utils/constants.js';
import { api } from '../api/client.js';

export default function DeployWizard({ sites, onDeployed, onClose }) {
  const [step, setStep] = useState(0);
  const [cfg, setCfg] = useState({
    niche: '', nicheRu: '', market: 'RU', deployType: 'subdirectory',
    parentSite: sites?.[0]?.id || '', domain: '', subdirectory: '',
    theme: 'rehub', ssl: true, analytics: true,
    n8nWebhook: 'https://your-server.com/webhook/deploy-wp',
    serverHost: 'your-server.com',
  });
  const [aiPlan, setAiPlan] = useState(null);
  const [deployLog, setDeployLog] = useState([]);

  const parentSite = (sites || []).find((s) => s.id === cfg.parentSite);
  const getUrl = () => {
    if (cfg.deployType === 'newdomain') return cfg.domain || 'new-site.com';
    if (cfg.deployType === 'subdirectory') return `${parentSite?.name || 'site.com'}/${cfg.subdirectory || 'niche'}`;
    return `${cfg.subdirectory || 'niche'}.${parentSite?.name || 'site.com'}`;
  };

  const genPlan = async () => {
    setStep(1);
    try {
      const { plan } = await api.aiSitePlan({
        niche: cfg.niche || cfg.nicheRu,
        market: cfg.market,
        deployType: cfg.deployType,
        parentSite: parentSite?.name,
      });
      setAiPlan(plan);
      setStep(2);
    } catch (e) {
      setAiPlan({ error: e.message });
      setStep(2);
    }
  };

  const startDeploy = async () => {
    setStep(3);
    const steps = [
      '🔍 Проверка домена и DNS...',
      '🗄️ Создание базы данных MySQL...',
      '📦 Установка WordPress (WP-CLI)...',
      `🎨 Тема: ${cfg.theme === 'rehub' ? 'REHub' : 'Custom'}...`,
      '🔌 Плагины: Content Egg, WP All Import, WooCommerce, Rank Math...',
      '⚙️ Пермалинки и SEO...',
      cfg.ssl ? "🔒 SSL (Let's Encrypt)..." : '⏭️ SSL skip',
      cfg.analytics ? '📊 GA4 + GSC...' : '⏭️ Analytics skip',
      '📝 Категории...',
      '🚀 Финализация...',
    ];
    const acc = [];
    for (const msg of steps) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
      acc.push({ msg, status: 'ok' });
      setDeployLog([...acc]);
    }

    const url = getUrl();
    // 1. Создать сайт в БД
    const newSite = await api.createSite({
      name: url,
      market: cfg.market,
      niche: cfg.niche || cfg.nicheRu,
      status: 'setup',
      wpAdmin: `https://${url}/wp-admin`,
      ga4: cfg.analytics ? 'https://analytics.google.com' : '#',
      gsc: cfg.analytics ? 'https://search.google.com/search-console' : '#',
    });

    // 2. Сохранить деплой
    await api.createDeploy({
      siteId: newSite.id,
      config: { ...cfg, url },
      aiPlan,
    });

    // 3. Импортировать AI-план в контент-план нового сайта
    if (aiPlan?.firstArticles?.length) {
      for (const a of aiPlan.firstArticles) {
        try {
          await api.createPlan(newSite.id, {
            title: a.title, type: a.type || 'review', priority: a.priority || 'medium', status: 'idea',
          });
        } catch { /* noop */ }
      }
    }

    onDeployed?.(newSite);
    setStep(4);
  };

  return (
    <Modal title="🚀 Deploy Wizard" onClose={onClose} wide>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
        {['Настройка', 'AI-план', 'Ревью', 'Deploy', 'Готово'].map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ height: '3px', borderRadius: '2px', background: step >= i ? '#3b82f6' : '#1e293b', transition: 'all .3s', marginBottom: '4px' }} />
            <span style={{ fontSize: '9px', color: step >= i ? '#60a5fa' : '#475569' }}>{s}</span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#1e293b', borderRadius: '6px' }}>
            <span style={{ fontSize: '24px' }}>🚀</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>Развернуть новый сайт</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>WordPress + REHub + плагины за 1 клик</div>
            </div>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.8px' }}>1. Ниша и рынок</div>
          <Inp value={cfg.niche} onChange={(v) => setCfg({ ...cfg, niche: v })} placeholder="Ниша EN: electric kettles" />
          <Inp value={cfg.nicheRu} onChange={(v) => setCfg({ ...cfg, nicheRu: v })} placeholder="Ниша RU: электрические чайники" />
          <Sel value={cfg.market} onChange={(v) => setCfg({ ...cfg, market: v })} opts={[
            { v: 'RU', l: '🇷🇺 Россия' }, { v: 'NL', l: '🇳🇱 Нидерланды' }, { v: 'DE', l: '🇩🇪 Германия' }, { v: 'US', l: '🇺🇸 США' },
          ]} />

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.8px', marginTop: '4px' }}>2. Размещение</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { v: 'subdirectory', l: '📁 Поддиректория', d: 'site.com/niche/' },
              { v: 'subdomain',    l: '🌐 Поддомен',     d: 'niche.site.com' },
              { v: 'newdomain',    l: '🆕 Новый домен',  d: 'niche-expert.com' },
            ].map((o) => (
              <div
                key={o.v}
                onClick={() => setCfg({ ...cfg, deployType: o.v })}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', cursor: 'pointer', background: cfg.deployType === o.v ? '#3b82f615' : '#0f172a', border: cfg.deployType === o.v ? '2px solid #3b82f6' : '2px solid #1e293b', textAlign: 'center', transition: 'all .15s' }}
              >
                <div style={{ fontSize: '14px', marginBottom: '3px' }}>{o.l.split(' ')[0]}</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#e2e8f0' }}>{o.l.split(' ').slice(1).join(' ')}</div>
                <div style={{ fontSize: '9px', color: '#64748b', fontFamily: 'var(--mn)', marginTop: '2px' }}>{o.d}</div>
              </div>
            ))}
          </div>

          {cfg.deployType !== 'newdomain' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <Sel value={cfg.parentSite} onChange={(v) => setCfg({ ...cfg, parentSite: v })} opts={(sites || []).map((s) => ({ v: s.id, l: s.name }))} sx={{ flex: 1 }} />
              <Inp value={cfg.subdirectory} onChange={(v) => setCfg({ ...cfg, subdirectory: v })} placeholder={cfg.deployType === 'subdirectory' ? 'path (chainiki)' : 'subdomain (chainiki)'} sx={{ flex: 1 }} />
            </div>
          )}
          {cfg.deployType === 'newdomain' && (
            <Inp value={cfg.domain} onChange={(v) => setCfg({ ...cfg, domain: v })} placeholder="chainiki-expert.ru" />
          )}
          <div style={{ padding: '8px 12px', background: '#1e293b', borderRadius: '5px', fontSize: '12px', fontFamily: 'var(--mn)', color: '#60a5fa' }}>→ {getUrl()}</div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.8px', marginTop: '4px' }}>3. Настройки</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Sel value={cfg.theme} onChange={(v) => setCfg({ ...cfg, theme: v })} opts={[{ v: 'rehub', l: '🎨 REHub' }, { v: 'custom', l: '🎨 Custom' }]} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}>
              <input type="checkbox" checked={cfg.ssl} onChange={(e) => setCfg({ ...cfg, ssl: e.target.checked })} /> SSL
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#94a3b8', cursor: 'pointer' }}>
              <input type="checkbox" checked={cfg.analytics} onChange={(e) => setCfg({ ...cfg, analytics: e.target.checked })} /> GA4
            </label>
          </div>

          <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.8px', marginTop: '4px' }}>4. Сервер</div>
          <Inp value={cfg.n8nWebhook} onChange={(v) => setCfg({ ...cfg, n8nWebhook: v })} placeholder="n8n webhook URL" />
          <Inp value={cfg.serverHost} onChange={(v) => setCfg({ ...cfg, serverHost: v })} placeholder="IP/hostname сервера" />

          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <Btn onClick={onClose}>Отмена</Btn>
            <Btn v="acc" onClick={genPlan} disabled={!cfg.niche && !cfg.nicheRu}>🤖 AI: Спланировать →</Btn>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}>🤖</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>AI планирует структуру...</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{cfg.niche || cfg.nicheRu} · {cfg.market}</div>
        </div>
      )}

      {step === 2 && (!aiPlan || aiPlan.error ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ color: '#ef4444', marginBottom: '10px' }}>⚠️ {aiPlan?.error || 'Ошибка'}</div>
          <Btn onClick={genPlan} v="acc">Повторить</Btn>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '12px', background: '#1e293b', borderRadius: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#e2e8f0', marginBottom: '4px' }}>📋 AI-план: {getUrl()}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{aiPlan.siteName}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ padding: '10px', background: '#0f172a', borderRadius: '5px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>SEO Title</div>
              <div style={{ fontSize: '12px', color: '#e2e8f0' }}>{aiPlan.seoTitle}</div>
            </div>
            <div style={{ padding: '10px', background: '#0f172a', borderRadius: '5px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Конкуренция</div>
              <div style={{ fontSize: '12px', color: aiPlan.competitionLevel === 'low' ? '#34d399' : aiPlan.competitionLevel === 'high' ? '#ef4444' : '#fbbf24', fontWeight: 700 }}>
                {aiPlan.competitionLevel === 'low' ? '🟢 Низкая' : aiPlan.competitionLevel === 'high' ? '🔴 Высокая' : '🟡 Средняя'}
              </div>
            </div>
          </div>
          <div style={{ padding: '10px', background: '#0f172a', borderRadius: '5px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Трафик прогноз</div>
            <div style={{ fontSize: '12px', color: '#e2e8f0' }}>{aiPlan.estimatedTraffic}</div>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Категории</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(aiPlan.categories || []).map((c, i) => (
              <span key={i} style={{ padding: '3px 8px', background: '#1e293b', borderRadius: '4px', fontSize: '11px', color: '#94a3b8' }}>{c}</span>
            ))}
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Первые 5 статей</div>
          {(aiPlan.firstArticles || []).map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: '#0f172a', borderRadius: '4px', border: '1px solid #1e293b' }}>
              <span>{TI[a.type] || '📄'}</span>
              <span style={{ fontSize: '12px', color: '#e2e8f0', flex: 1 }}>{a.title}</span>
              <span style={{ fontSize: '9px', color: '#475569', fontFamily: 'var(--mn)' }}>{a.slug}</span>
              <span style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '9px', background: (PC[a.priority] || '#64748b') + '20', color: PC[a.priority] || '#64748b' }}>{a.priority}</span>
            </div>
          ))}
          <div style={{ padding: '10px', background: '#0f172a', borderRadius: '5px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Монетизация</div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{aiPlan.monetization}</div>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase' }}>Ключевые слова</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(aiPlan.keywords || []).map((k, i) => (
              <span key={i} style={{ padding: '2px 7px', background: '#1e293b', borderRadius: '3px', fontSize: '10px', color: '#94a3b8', fontFamily: 'var(--mn)' }}>{k}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <Btn onClick={() => setStep(0)}>← Назад</Btn>
            <Btn v="acc" onClick={genPlan}>🔄 Заново</Btn>
            <Btn v="success" onClick={startDeploy}>🚀 Развернуть!</Btn>
          </div>
        </div>
      ))}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: '#f9731615', borderRadius: '6px', border: '1px solid #f9731630' }}>
            <span style={{ fontSize: '20px', animation: 'pulse 1s infinite' }}>⚙️</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f97316' }}>Развёртывание...</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{getUrl()}</div>
            </div>
          </div>
          {deployLog.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', fontSize: '11px' }}>
              <span style={{ color: '#34d399' }}>✓</span>
              <span style={{ color: '#94a3b8' }}>{l.msg}</span>
            </div>
          ))}
          <div style={{ width: '100%', height: '3px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{ height: '100%', background: '#3b82f6', borderRadius: '2px', width: `${(deployLog.length / 10) * 100}%`, transition: 'width .3s' }} />
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#34d399', marginBottom: '6px' }}>Сайт развёрнут!</div>
          <div style={{ fontSize: '13px', color: '#e2e8f0', fontFamily: 'var(--mn)', marginBottom: '16px' }}>{getUrl()}</div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <XLink href={`https://${getUrl()}`} label="Открыть" icon="🌐" />
            <XLink href={`https://${getUrl()}/wp-admin`} label="WP Admin" icon="⚡" />
          </div>
          <div style={{ marginTop: '16px', padding: '10px', background: '#1e293b', borderRadius: '6px', fontSize: '11px', color: '#64748b', textAlign: 'left' }}>
            <strong style={{ color: '#94a3b8' }}>Следующие шаги:</strong>
            <div style={{ marginTop: '4px' }}>1. Content Egg API ключи</div>
            <div>2. Партнёрские сети</div>
            <div>3. Первые статьи из AI-плана</div>
            <div>4. Google Analytics + Search Console</div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <Btn v="acc" onClick={onClose}>Готово →</Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}
