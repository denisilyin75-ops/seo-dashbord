import { useState, useEffect, useRef } from 'react';
import { api, getToken } from '../api/client.js';
import { Btn, Inp, Sel, Modal } from './ui.jsx';

// DeployWizardV2 — Phase 1 Real-provisioning.
//
// Flow:
//   1. Choose template (coffee-review / cleaning / running-shoes / electronics / custom)
//   2. Form: domain + site_slug + title + admin_email + optional overrides
//   3. Review config (показываем полный env preset что пойдёт в provision-site.sh)
//   4. Enqueue task → SSE streaming progress
//   5. Success → показываем admin URL + auto-link к SCC site
//
// Requirements on host:
//   - bash deploy-worker.sh запущен (systemd / tmux)
//   - DEPLOY_WORKER_TOKEN env совпадает в SCC и worker

const STEPS = ['template', 'config', 'review', 'execute', 'result'];

export default function DeployWizardV2({ open, onClose, onComplete }) {
  const [step, setStep] = useState('template');
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [template, setTemplate] = useState(null);
  const [cfg, setCfg] = useState({
    DOMAIN: '',
    SITE_SLUG: '',
    SITE_TITLE: '',
    SITE_DESCRIPTION: '',
    ADMIN_EMAIL: '',
    ADMIN_USER: '',
    CATEGORIES: '',
  });
  const [task, setTask] = useState(null);
  const [log, setLog] = useState('');
  const [err, setErr] = useState(null);
  const logRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Load templates on open
  useEffect(() => {
    if (!open) return;
    api.listTemplates()
      .then(r => setTemplates(r.templates || []))
      .catch(e => setErr(e.message));
  }, [open]);

  // On template change → merge defaults into cfg
  useEffect(() => {
    if (!templateId) return;
    api.getTemplate(templateId).then(t => {
      setTemplate(t);
      setCfg(c => ({
        ...t.defaults,
        ...c, // user values override
      }));
    });
  }, [templateId]);

  // Auto-derive slug + admin_user from domain
  useEffect(() => {
    if (!cfg.DOMAIN) return;
    const slug = cfg.DOMAIN.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    setCfg(c => ({
      ...c,
      SITE_SLUG: c.SITE_SLUG || slug,
      ADMIN_USER: c.ADMIN_USER || `admin_${slug.slice(0, 10)}`,
    }));
  }, [cfg.DOMAIN]);

  // SSE subscription при task в running/queued
  useEffect(() => {
    if (!task || ['success', 'failed', 'cancelled'].includes(task.status)) {
      eventSourceRef.current?.close();
      return;
    }
    const token = getToken();
    // SSE не поддерживает custom headers → используем polling вместо EventSource
    // (SCC auth требует Bearer header)
    const iv = setInterval(async () => {
      try {
        const fresh = await api.getDeployTask(task.id);
        setTask(fresh);
        setLog(fresh.log || '');
      } catch {}
    }, 1500);
    return () => clearInterval(iv);
  }, [task?.id, task?.status]);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  if (!open) return null;

  const canNext = {
    template: !!templateId,
    config: cfg.DOMAIN && cfg.SITE_SLUG && cfg.SITE_TITLE && cfg.ADMIN_EMAIL,
    review: true,
    execute: task && ['success', 'failed'].includes(task.status),
    result: false,
  }[step];

  const next = async () => {
    setErr(null);
    if (step === 'template') setStep('config');
    else if (step === 'config') setStep('review');
    else if (step === 'review') {
      // Enqueue task
      try {
        const r = await api.enqueueDeploy({
          domain: cfg.DOMAIN,
          site_slug: cfg.SITE_SLUG,
          template: templateId,
          config: cfg,
        });
        setTask(r);
        setStep('execute');
      } catch (e) {
        setErr(e.message);
      }
    } else if (step === 'execute') {
      setStep('result');
    }
  };

  const back = () => {
    const i = STEPS.indexOf(step);
    if (i > 0 && step !== 'execute') setStep(STEPS[i - 1]);
  };

  const reset = () => {
    setStep('template');
    setTemplateId('');
    setTemplate(null);
    setCfg({ DOMAIN: '', SITE_SLUG: '', SITE_TITLE: '', SITE_DESCRIPTION: '', ADMIN_EMAIL: '', ADMIN_USER: '', CATEGORIES: '' });
    setTask(null);
    setLog('');
    setErr(null);
  };

  return (
    <Modal title="🚀 Deploy Wizard — новый сайт" onClose={() => { reset(); onClose?.(); }}>
      <StepIndicator current={step} />

      {err && (
        <div style={{ padding: 10, marginBottom: 12, background: '#7f1d1d30', border: '1px solid #ef4444', borderRadius: 4, fontSize: 11, color: '#fca5a5' }}>
          Ошибка: {err}
        </div>
      )}

      {step === 'template' && (
        <TemplateStep templates={templates} selected={templateId} onSelect={setTemplateId} />
      )}
      {step === 'config' && (
        <ConfigStep cfg={cfg} setCfg={setCfg} template={template} />
      )}
      {step === 'review' && (
        <ReviewStep cfg={cfg} templateId={templateId} />
      )}
      {step === 'execute' && (
        <ExecuteStep task={task} log={log} logRef={logRef} />
      )}
      {step === 'result' && (
        <ResultStep task={task} cfg={cfg} onReset={reset} onComplete={onComplete} />
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid #1e293b' }}>
        {step !== 'template' && step !== 'execute' && step !== 'result' && (
          <Btn onClick={back}>← Назад</Btn>
        )}
        {step !== 'result' && canNext && (
          <Btn onClick={next} v="acc">
            {step === 'review' ? '🚀 Запустить' : step === 'execute' ? 'Далее →' : 'Далее →'}
          </Btn>
        )}
      </div>
    </Modal>
  );
}

function StepIndicator({ current }) {
  const idx = STEPS.indexOf(current);
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16, fontSize: 10 }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{
          padding: '4px 10px', borderRadius: 3, fontFamily: 'var(--mn)',
          background: i === idx ? '#3b82f625' : i < idx ? '#0f172a' : '#0a0e17',
          border: `1px solid ${i === idx ? '#3b82f6' : '#1e293b'}`,
          color: i <= idx ? '#e2e8f0' : '#475569',
          textTransform: 'uppercase',
        }}>
          {i + 1}. {s}
        </div>
      ))}
    </div>
  );
}

function TemplateStep({ templates, selected, onSelect }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
        Выберите шаблон для новой ниши. Готовые категории, плагины, структура.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
        {templates.map(t => (
          <div
            key={t.template_id}
            onClick={() => onSelect(t.template_id)}
            style={{
              padding: 12, cursor: 'pointer',
              background: selected === t.template_id ? '#3b82f615' : '#0f172a',
              border: `2px solid ${selected === t.template_id ? '#3b82f6' : '#1e293b'}`,
              borderRadius: 6,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>
              {t.label}
            </div>
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
              {t.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigStep({ cfg, setCfg, template }) {
  const upd = (k, v) => setCfg(c => ({ ...c, [k]: v }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, color: '#94a3b8' }}>
        Заполните основные поля. Категории подставлены из шаблона — можете редактировать.
      </div>

      <Field label="Домен *" hint="Должен иметь A-запись → 5.129.245.98 ПЕРЕД запуском (Let's Encrypt проверит)">
        <Inp value={cfg.DOMAIN} onChange={v => upd('DOMAIN', v)} placeholder="example.ru" />
      </Field>

      <div style={{ display: 'flex', gap: 8 }}>
        <Field label="Site slug *" sx={{ flex: 1 }}>
          <Inp value={cfg.SITE_SLUG} onChange={v => upd('SITE_SLUG', v)} placeholder="example" />
        </Field>
        <Field label="Admin user" sx={{ flex: 1 }}>
          <Inp value={cfg.ADMIN_USER} onChange={v => upd('ADMIN_USER', v)} placeholder="admin_example" />
        </Field>
      </div>

      <Field label="Site title *">
        <Inp value={cfg.SITE_TITLE} onChange={v => upd('SITE_TITLE', v)} placeholder="Example — обзоры..." />
      </Field>

      <Field label="Site description *">
        <Inp value={cfg.SITE_DESCRIPTION} onChange={v => upd('SITE_DESCRIPTION', v)} placeholder="Обзоры, сравнения, рейтинги..." />
      </Field>

      <Field label="Admin email *">
        <Inp value={cfg.ADMIN_EMAIL} onChange={v => upd('ADMIN_EMAIL', v)} placeholder="admin@example.ru" />
      </Field>

      <Field label="Категории" hint="Формат: Name|slug=slug|desc=Description; разделитель ;">
        <textarea
          value={cfg.CATEGORIES}
          onChange={e => upd('CATEGORIES', e.target.value)}
          style={{
            width: '100%', padding: 6, fontSize: 11, minHeight: 80,
            background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4,
            color: '#e2e8f0', fontFamily: 'var(--mn)',
          }}
          placeholder="Кофемашины|slug=kofemashiny|desc=...;Кухня|slug=kuhnya|desc=..."
        />
      </Field>
    </div>
  );
}

function Field({ label, children, hint, sx }) {
  return (
    <div style={sx}>
      <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 3, fontWeight: 600 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function ReviewStep({ cfg, templateId }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
        Проверьте параметры. После Запустить задача пойдёт в очередь → host-worker выполнит provision-site.sh (~5-10 мин).
      </div>
      <div style={{
        padding: 10, background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4,
        fontSize: 11, fontFamily: 'var(--mn)', color: '#cbd5e1',
        maxHeight: 350, overflow: 'auto', lineHeight: 1.5,
      }}>
        <div style={{ color: '#60a5fa', marginBottom: 6 }}># Template: {templateId}</div>
        {Object.entries(cfg).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
          <div key={k}><span style={{ color: '#64748b' }}>{k}</span>=<span>{String(v).slice(0, 100)}</span></div>
        ))}
      </div>
      <div style={{ marginTop: 8, padding: 8, background: '#78350f30', border: '1px solid #f59e0b', borderRadius: 4, fontSize: 10, color: '#fbbf24' }}>
        ⚠️ Убедитесь что DNS A-запись {cfg.DOMAIN} → 5.129.245.98 установлена. Let's Encrypt проверит домен в процессе.
      </div>
    </div>
  );
}

function ExecuteStep({ task, log, logRef }) {
  const status = task?.status || 'queued';
  const statusColor = {
    queued: '#fbbf24', running: '#60a5fa', success: '#22c55e', failed: '#ef4444', cancelled: '#64748b',
  }[status] || '#64748b';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
        <span style={{ color: statusColor, fontWeight: 700, textTransform: 'uppercase' }}>● {status}</span>
        <span style={{ color: '#64748b', fontFamily: 'var(--mn)' }}>{task?.id}</span>
        {task?.workerHost && <span style={{ color: '#475569', fontFamily: 'var(--mn)' }}>worker: {task.workerHost}</span>}
        {status === 'queued' && (
          <span style={{ color: '#fbbf24', fontSize: 10 }}>
            (Ждёт host-worker. Проверьте что deploy-worker.sh запущен на хосте.)
          </span>
        )}
      </div>
      <pre
        ref={logRef}
        style={{
          padding: 10, background: '#0a0e17', border: '1px solid #1e293b', borderRadius: 4,
          fontSize: 10, fontFamily: 'var(--mn)', color: '#cbd5e1',
          height: 400, overflow: 'auto', lineHeight: 1.45,
          margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}
      >
{log || '(ожидание первых логов от worker…)'}
      </pre>
    </div>
  );
}

function ResultStep({ task, cfg, onReset, onComplete }) {
  const success = task?.status === 'success';
  return (
    <div>
      {success ? (
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e', marginBottom: 10 }}>
            ✓ Сайт развёрнут!
          </div>
          <div style={{ padding: 10, background: '#0a0e17', borderRadius: 4, fontSize: 11 }}>
            <div>Домен: <a href={`https://${cfg.DOMAIN}`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>https://{cfg.DOMAIN}</a></div>
            <div>wp-admin: <a href={`https://${cfg.DOMAIN}/wp-admin`} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>https://{cfg.DOMAIN}/wp-admin</a></div>
            <div>Admin user: <code>{cfg.ADMIN_USER}</code></div>
            <div style={{ color: '#fbbf24', marginTop: 6 }}>
              ⚠️ Admin password сгенерирован в logs — проверьте Execute step scroll.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Btn onClick={onReset}>Ещё один сайт</Btn>
            <Btn onClick={() => onComplete?.(task)} v="acc">Готово</Btn>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 10 }}>
            ✕ Deploy failed
          </div>
          {task?.error && (
            <div style={{ padding: 8, background: '#7f1d1d30', border: '1px solid #ef4444', borderRadius: 4, fontSize: 11, color: '#fca5a5' }}>
              {task.error}
            </div>
          )}
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            Проверьте логи предыдущего шага. Можно попробовать снова после устранения причины.
          </div>
          <Btn onClick={onReset} sx={{ marginTop: 12 }}>Сбросить</Btn>
        </div>
      )}
    </div>
  );
}
