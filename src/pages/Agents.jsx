import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Btn, Inp, Sel } from '../components/ui.jsx';
import { useTryToast } from '../components/Toast.jsx';

const SCHEDULE_OPTIONS = [
  { v: '', l: 'Не запускать (on-demand)' },
  { v: '@hourly', l: 'Каждый час' },
  { v: '@daily', l: 'Раз в день' },
  { v: '@weekly', l: 'Раз в неделю' },
  { v: '@monthly', l: 'Раз в месяц' },
  { v: 'interval:15m', l: 'Каждые 15 минут' },
  { v: 'interval:2h', l: 'Каждые 2 часа' },
  { v: 'interval:6h', l: 'Каждые 6 часов' },
];

function formatWhen(iso) {
  if (!iso) return 'никогда';
  const d = new Date(iso + (iso.endsWith('Z') ? '' : 'Z'));
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  return `${Math.floor(diff / 86400)} дн назад`;
}

const STATUS_COLOR = {
  success: '#34d399',
  error: '#ef4444',
  skipped: '#fbbf24',
  running: '#60a5fa',
};

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const tryToast = useTryToast();

  const load = async () => {
    setLoading(true);
    const a = await api.listAgents();
    setAgents(a);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runNow = (id) => tryToast(async () => {
    await api.runAgent(id);
    await load();
    if (selected?.id === id) {
      const fresh = await api.getAgent(id);
      setSelected(fresh);
    }
  }, { success: 'Агент запущен' });

  const toggleEnabled = (agent) => tryToast(async () => {
    await api.updateAgent(agent.id, { enabled: !agent.enabled });
    await load();
    if (selected?.id === agent.id) setSelected({ ...agent, enabled: !agent.enabled });
  }, { success: agent.enabled ? 'Отключён' : 'Включён' });

  if (loading) {
    return <div style={{ padding: 20, color: '#64748b' }}>Загружаю агентов…</div>;
  }

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', margin: 0 }}>🤖 Агенты</h1>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
          Автоматические воркеры для синка метрик, мониторинга контента, офферов и других повторяющихся задач.
          Все по расписанию или по запросу. Каждый можно настроить, отключить или запустить вручную.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Список */}
        <div>
          {agents.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelected(a)}
              style={{
                background: selected?.id === a.id ? '#1e293b' : '#0f172a',
                border: `1px solid ${selected?.id === a.id ? '#3b82f6' : '#1e293b'}`,
                borderRadius: 7,
                padding: 12,
                marginBottom: 6,
                cursor: 'pointer',
                opacity: a.enabled ? 1 : 0.55,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{a.name}</span>
                    <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'var(--mn)', textTransform: 'uppercase' }}>
                      {a.kind === 'cron' ? (a.schedule || 'cron') : a.kind}
                    </span>
                    {!a.enabled && <span style={{ fontSize: 9, color: '#f97316', fontFamily: 'var(--mn)' }}>OFF</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                    {a.description?.slice(0, 140)}{a.description?.length > 140 ? '…' : ''}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 6, display: 'flex', gap: 10 }}>
                    <span>Последний запуск: {formatWhen(a.lastRunAt)}</span>
                    {a.lastRunStatus && (
                      <span style={{ color: STATUS_COLOR[a.lastRunStatus] || '#64748b' }}>
                        ● {a.lastRunStatus}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                  <Btn v="acc" onClick={(e) => { e.stopPropagation(); runNow(a.id); }} sx={{ fontSize: 10 }}>▶</Btn>
                  <Btn v="ghost" onClick={(e) => { e.stopPropagation(); toggleEnabled(a); }} sx={{ fontSize: 10 }}>
                    {a.enabled ? '⏸' : '▶'}
                  </Btn>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Детальный вид */}
        {selected && <AgentDetail agent={selected} onReload={load} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function AgentDetail({ agent, onReload, onClose }) {
  const [config, setConfig] = useState(agent.config || {});
  const [schedule, setSchedule] = useState(agent.schedule || '');
  const [runs, setRuns] = useState([]);
  const tryToast = useTryToast();

  useEffect(() => {
    setConfig(agent.config || {});
    setSchedule(agent.schedule || '');
    api.agentRuns(agent.id, 10).then(setRuns).catch(() => setRuns([]));
  }, [agent.id, agent.updatedAt]);

  const save = () => tryToast(async () => {
    await api.updateAgent(agent.id, { config, schedule });
    onReload();
  }, { success: 'Настройки сохранены' });

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>{agent.name}</div>
          <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--mn)', marginTop: 2 }}>id: {agent.id}</div>
        </div>
        <Btn v="ghost" onClick={onClose} sx={{ fontSize: 12 }}>✕</Btn>
      </div>

      <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5, marginBottom: 14 }}>
        {agent.description}
      </div>

      {/* Расписание */}
      {agent.kind === 'cron' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>Расписание</div>
          <Sel value={schedule} onChange={setSchedule} opts={SCHEDULE_OPTIONS} />
        </div>
      )}

      {/* Config */}
      {agent.configSchema && agent.configSchema.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>Параметры</div>
          {agent.configSchema.map((field) => (
            <ConfigField
              key={field.key}
              field={field}
              value={config[field.key] ?? field.default}
              onChange={(v) => setConfig({ ...config, [field.key]: v })}
            />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <Btn v="acc" onClick={save} sx={{ fontSize: 11 }}>💾 Сохранить</Btn>
        <Btn v="success" onClick={() => tryToast(async () => {
          await api.runAgent(agent.id);
          const fresh = await api.getAgent(agent.id);
          onReload();
          api.agentRuns(agent.id, 10).then(setRuns);
        }, { success: 'Запущено' })} sx={{ fontSize: 11 }}>▶ Запустить сейчас</Btn>
      </div>

      {/* История */}
      <div>
        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase' }}>
          Последние запуски
        </div>
        {runs.length === 0 && <div style={{ fontSize: 11, color: '#475569' }}>История пуста</div>}
        {runs.map((r) => (
          <div key={r.id} style={{ fontSize: 10, padding: '6px 0', borderBottom: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: STATUS_COLOR[r.status] || '#64748b' }}>
                ● {r.status} {r.triggeredBy !== 'schedule' ? `(${r.triggeredBy})` : ''}
              </span>
              <span style={{ color: '#64748b', fontFamily: 'var(--mn)' }}>{formatWhen(r.startedAt)}</span>
            </div>
            <div style={{ color: '#94a3b8', marginTop: 2 }}>{r.summary}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigField({ field, value, onChange }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 10, color: '#94a3b8', display: 'block', marginBottom: 2 }}>{field.label}</label>
      {field.type === 'number' ? (
        <Inp type="number" value={value} onChange={(v) => onChange(Number(v))} sx={{ fontSize: 12 }} />
      ) : field.type === 'boolean' ? (
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#e2e8f0' }}>
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span>{value ? 'Включено' : 'Выключено'}</span>
        </label>
      ) : field.type === 'tags' ? (
        <Inp
          value={Array.isArray(value) ? value.join(',') : String(value || '')}
          onChange={(v) => onChange(v.split(',').map((s) => s.trim()).filter(Boolean))}
          sx={{ fontSize: 12 }}
        />
      ) : (
        <Inp value={value || ''} onChange={onChange} sx={{ fontSize: 12 }} />
      )}
      {field.hint && <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{field.hint}</div>}
    </div>
  );
}
