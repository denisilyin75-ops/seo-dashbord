import { useState } from 'react';
import { Badge, Btn, Inp, Sel } from './ui.jsx';
import Markdown from './Markdown.jsx';
import { TI } from '../utils/constants.js';
import { fmt } from '../utils/format.js';
import { api } from '../api/client.js';
import RevisionsModal, { freshnessLevel } from './RevisionsModal.jsx';

export default function ArticleRow({ article, onUpdate, onDelete }) {
  const [cmd, setCmd] = useState('');
  const [ld, setLd] = useState(false);
  const [res, setRes] = useState(null);
  const [editing, setEditing] = useState(false);
  const [dr, setDr] = useState(article);
  const [showHistory, setShowHistory] = useState(false);
  const fresh = freshnessLevel(article.updated);

  const runAI = async () => {
    if (!cmd.trim()) return;
    setLd(true); setRes(null);
    try {
      const r = await api.aiCommand(cmd, { siteId: article.siteId, articleId: article.id });
      setRes(r.result);
      setCmd('');
    } catch (e) {
      setRes('⚠️ ' + e.message);
    }
    setLd(false);
  };

  return (
    <div style={{ background: '#0f172a', borderRadius: '6px', padding: '10px 12px', border: '1px solid #1e293b', marginBottom: '4px' }}>
      {!editing ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px' }}>{TI[article.type] || '📄'}</span>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0' }}>{article.title}</div>
              <div style={{ fontSize: '10px', color: '#475569', fontFamily: 'var(--mn)' }}>{article.url}</div>
            </div>
            <Badge s={article.status} />
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', fontFamily: 'var(--mn)' }}>
              <span style={{ color: '#64748b' }}>👁{fmt(article.sessions)}</span>
              <span style={{ color: '#60a5fa' }}>🖱{fmt(article.clicks)}</span>
              <span style={{ color: article.cr > 3 ? '#34d399' : article.cr > 0 ? '#fbbf24' : '#475569' }}>⚡{article.cr}%</span>
            </div>
            <button
              type="button"
              onClick={() => setShowHistory(true)}
              title={`Клик — история изменений. Цвет = свежесть (зелёный <30д, жёлтый <6мес, оранжевый <12мес, красный >12мес)`}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: `1px solid ${fresh.color}40`, color: fresh.color,
                borderRadius: 4, padding: '3px 7px', fontSize: 10, fontFamily: 'var(--mn)', cursor: 'pointer',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: fresh.color, display: 'inline-block' }} />
              {fresh.label}
            </button>
            <Btn onClick={() => { setDr({ ...article }); setEditing(true); }} v="ghost" sx={{ fontSize: '12px' }}>✏️</Btn>
            <Btn onClick={() => onDelete(article.id)} v="ghost" sx={{ fontSize: '12px', color: '#ef4444' }}>🗑</Btn>
          </div>
          {showHistory && <RevisionsModal article={article} onClose={() => setShowHistory(false)} />}
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            <Inp value={cmd} onChange={setCmd} onKeyDown={(e) => e.key === 'Enter' && runAI()} placeholder="AI: обнови, добавь модель, перепиши..." sx={{ flex: 1 }} />
            <Btn onClick={runAI} disabled={ld} v="acc">{ld ? '⏳' : '▶ AI'}</Btn>
          </div>
          {res && (
            <div style={{ marginTop: '6px', padding: '10px 12px', background: '#1e293b', borderRadius: '5px', borderLeft: '3px solid #3b82f6', position: 'relative' }}>
              <Markdown>{res}</Markdown>
              <button
                type="button"
                onClick={() => { try { navigator.clipboard.writeText(res); } catch {} }}
                title="Скопировать"
                style={{ position: 'absolute', top: '6px', right: '6px', background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', fontSize: '10px', padding: '2px 6px', borderRadius: '3px', cursor: 'pointer' }}
              >📋</button>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <Inp value={dr.title} onChange={(v) => setDr({ ...dr, title: v })} placeholder="Заголовок" sx={{ flex: 2 }} />
            <Inp value={dr.url} onChange={(v) => setDr({ ...dr, url: v })} placeholder="/url/" sx={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <Sel value={dr.type} onChange={(v) => setDr({ ...dr, type: v })} opts={[
              { v: 'review', l: 'Обзор' }, { v: 'comparison', l: 'Сравнение' }, { v: 'guide', l: 'Гайд' }, { v: 'quiz', l: 'Квиз' }, { v: 'tool', l: 'Инструмент' },
            ]} />
            <Sel value={dr.status} onChange={(v) => setDr({ ...dr, status: v })} opts={[
              { v: 'published', l: 'Published' }, { v: 'draft', l: 'Draft' }, { v: 'planned', l: 'Planned' },
            ]} />
            <Inp value={dr.sessions} onChange={(v) => setDr({ ...dr, sessions: +v || 0 })} placeholder="Sessions" sx={{ width: '75px' }} />
            <Inp value={dr.clicks} onChange={(v) => setDr({ ...dr, clicks: +v || 0 })} placeholder="Clicks" sx={{ width: '75px' }} />
            <Inp value={dr.cr} onChange={(v) => setDr({ ...dr, cr: +v || 0 })} placeholder="CR%" sx={{ width: '65px' }} />
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
            <Btn onClick={() => setEditing(false)}>Отмена</Btn>
            <Btn onClick={() => { onUpdate(dr); setEditing(false); }} v="acc">💾</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
