import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Btn } from './ui.jsx';

// ImageFinderModal — search + select + assign image flow.
//
// 3 режима поиска:
//   1. Unsplash CC0 photos — бесплатно, instant
//   2. Flux AI generate — $0.04/image, prompt-based
//   3. Manual URL — вставить свою ссылку (для manufacturer press kits)
//
// Props:
//   open, onClose, onAssigned
//   siteId, postId (WP post ID)
//   defaultQuery (из title / brand+model)
//   suggestedPrompts — массив AI prompts (для ниши-специфичных)

export default function ImageFinderModal({ open, onClose, onAssigned, siteId, postId, defaultQuery, suggestedPrompts = [] }) {
  const [tab, setTab] = useState('unsplash');
  const [query, setQuery] = useState(defaultQuery || '');
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [assigning, setAssigning] = useState(null);

  // Flux prompt state
  const [fluxPrompt, setFluxPrompt] = useState(suggestedPrompts[0] || '');
  const [fluxAspect, setFluxAspect] = useState('landscape');
  const [generating, setGenerating] = useState(false);

  // Manual URL state
  const [manualUrl, setManualUrl] = useState('');
  const [manualAttribution, setManualAttribution] = useState('');

  useEffect(() => { setQuery(defaultQuery || ''); }, [defaultQuery]);

  if (!open) return null;

  const searchUnsplash = async () => {
    if (!query.trim()) return;
    setLoading(true); setErr(null); setCandidates([]);
    try {
      const r = await api.searchUnsplash(query, 9, 'landscape');
      if (r.error) setErr(r.error);
      setCandidates(r.items || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const generateFlux = async () => {
    if (!fluxPrompt.trim()) return;
    setGenerating(true); setErr(null);
    try {
      const r = await api.generateFluxImage({
        prompt: fluxPrompt,
        aspect: fluxAspect,
        source_id: String(postId),
        site_id: siteId,
      });
      if (r.error) {
        setErr(r.error);
      } else {
        setCandidates(prev => [r, ...prev]);
      }
    } catch (e) { setErr(e.message); }
    setGenerating(false);
  };

  const assign = async (candidate) => {
    setAssigning(candidate.id); setErr(null);
    try {
      const body = {
        site_id: siteId,
        post_id: postId,
        source: candidate.source,
        attribution: candidate.attribution,
        license: candidate.license,
        alt_text: candidate.description || query,
        unsplash_download_url: candidate.track_download_url,
      };
      if (candidate.base64) body.image_base64 = candidate.base64;
      else body.image_url = candidate.download_url || candidate.url;

      const r = await api.assignImage(body);
      if (r.featured_set) {
        onAssigned?.({ ...r, candidate });
        onClose();
      } else {
        setErr('Upload успех, но featured_media не установлен');
      }
    } catch (e) { setErr(e.message); }
    setAssigning(null);
  };

  const assignManual = async () => {
    if (!manualUrl.trim()) return;
    setAssigning('manual'); setErr(null);
    try {
      const r = await api.assignImage({
        site_id: siteId,
        post_id: postId,
        image_url: manualUrl,
        source: 'manual',
        license: 'manual_entry',
        attribution: manualAttribution || null,
        alt_text: query || 'Manually added',
      });
      if (r.featured_set) {
        onAssigned?.({ ...r, candidate: { source: 'manual', url: manualUrl, attribution: manualAttribution } });
        onClose();
      } else {
        setErr('Featured не установлен');
      }
    } catch (e) { setErr(e.message); }
    setAssigning(null);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: '#000a', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0a0e17', border: '1px solid #334155', borderRadius: 6,
          padding: 16, width: '100%', maxWidth: 900, maxHeight: '90vh', overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: '#e2e8f0' }}>🖼 Найти featured image</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {[
            { v: 'unsplash', l: '📷 Unsplash (CC0)' },
            { v: 'flux',     l: '✨ AI generate ($0.04)' },
            { v: 'manual',   l: '🔗 Manual URL' },
          ].map(t => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              style={{
                padding: '5px 10px', fontSize: 11, borderRadius: 3,
                background: tab === t.v ? '#3b82f625' : 'transparent',
                border: `1px solid ${tab === t.v ? '#3b82f6' : '#1e293b'}`,
                color: '#e2e8f0', cursor: 'pointer',
              }}
            >{t.l}</button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'unsplash' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchUnsplash()}
                placeholder="coffee machine espresso"
                style={{ flex: 1, padding: '6px 10px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 3, color: '#e2e8f0', fontSize: 12 }}
              />
              <Btn onClick={searchUnsplash} disabled={loading || !query.trim()} v="acc">
                {loading ? '…' : '🔍 Search'}
              </Btn>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>
              Unsplash API — бесплатно, лимит 50 req/час. Для product shots (DeLonghi/Philips) — лучше вкладка "Manual URL" с press-kit ссылкой.
            </div>
          </div>
        )}

        {tab === 'flux' && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>AI prompt:</label>
              <textarea
                value={fluxPrompt}
                onChange={e => setFluxPrompt(e.target.value)}
                placeholder="Editorial illustration of coffee brewing process, minimalist, warm tones, no text no logos"
                style={{
                  width: '100%', padding: 6, minHeight: 60, fontSize: 11,
                  background: '#0f172a', border: '1px solid #1e293b', borderRadius: 3, color: '#e2e8f0', fontFamily: 'inherit',
                }}
              />
            </div>
            {suggestedPrompts.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Suggestions:</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {suggestedPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => setFluxPrompt(p)}
                      style={{
                        padding: '3px 6px', fontSize: 10, borderRadius: 3,
                        background: '#1e293b', border: '1px solid #334155',
                        color: '#94a3b8', cursor: 'pointer',
                        maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                      title={p}
                    >{p.slice(0, 50)}...</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select
                value={fluxAspect}
                onChange={e => setFluxAspect(e.target.value)}
                style={{ padding: '4px 8px', fontSize: 11, background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0', borderRadius: 3 }}
              >
                <option value="landscape">16:9 landscape</option>
                <option value="square">1:1 square</option>
                <option value="portrait">3:4 portrait</option>
              </select>
              <Btn onClick={generateFlux} disabled={generating || !fluxPrompt.trim()} v="acc">
                {generating ? 'Генерирую…' : '✨ Generate'}
              </Btn>
              <span style={{ fontSize: 10, color: '#fbbf24', marginLeft: 6 }}>~$0.04 · 10-20s</span>
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>
              Негативный prompt автодобавляется: text, watermark, logo, trademark, brand name. Brand-safe.
            </div>
          </div>
        )}

        {tab === 'manual' && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Image URL:</label>
              <input
                value={manualUrl}
                onChange={e => setManualUrl(e.target.value)}
                placeholder="https://delonghi.com/press/magnifica-s.jpg"
                style={{ width: '100%', padding: '6px 10px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 3, color: '#e2e8f0', fontSize: 11 }}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 3 }}>Attribution (обязательно для press-kit):</label>
              <input
                value={manualAttribution}
                onChange={e => setManualAttribution(e.target.value)}
                placeholder="© De'Longhi Press Room"
                style={{ width: '100%', padding: '6px 10px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 3, color: '#e2e8f0', fontSize: 11 }}
              />
            </div>
            <Btn onClick={assignManual} disabled={!manualUrl.trim() || assigning === 'manual'} v="acc">
              {assigning === 'manual' ? 'Assigning…' : 'Assign as featured'}
            </Btn>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 8 }}>
              Для manufacturer press kits: delonghi.com/press · philips.com/press-info · jura.com/press · saeco.com/press-center
            </div>
          </div>
        )}

        {err && (
          <div style={{ marginTop: 10, padding: 8, background: '#7f1d1d30', border: '1px solid #ef4444', borderRadius: 3, color: '#fca5a5', fontSize: 11 }}>
            {err}
          </div>
        )}

        {/* Candidates grid */}
        {candidates.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>Click картинку для assign:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
              {candidates.map(c => {
                const imgSrc = c.base64 ? `data:image/png;base64,${c.base64}` : (c.thumb_url || c.url);
                return (
                  <div
                    key={c.id}
                    onClick={() => !assigning && assign(c)}
                    style={{
                      background: '#0f172a', border: '1px solid #1e293b', borderRadius: 3,
                      cursor: assigning ? 'wait' : 'pointer',
                      opacity: assigning === c.id ? 0.5 : 1,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={imgSrc}
                      alt={c.description || 'candidate'}
                      style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{ padding: '4px 6px', fontSize: 9 }}>
                      <div style={{ color: c.source === 'unsplash' ? '#22c55e' : '#a78bfa', fontWeight: 600 }}>
                        {c.source === 'unsplash' ? '📷 Unsplash' : '✨ Flux AI'}
                        {c.cost_usd && ` · $${c.cost_usd.toFixed(3)}`}
                      </div>
                      <div style={{ color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.attribution || c.prompt?.slice(0, 50) || ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
