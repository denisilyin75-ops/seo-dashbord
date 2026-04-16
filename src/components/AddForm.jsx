import { useState } from 'react';
import { Btn, Inp, Sel } from './ui.jsx';
import Field, { isDate, isSlug } from './Field.jsx';

function validate(d, isArticle) {
  const e = {};
  if (!d.title?.trim()) e.title = 'Введите название';
  if (isArticle) {
    if (d.url && !isSlug(d.url)) e.url = 'Формат: /slug-статьи/';
  } else {
    if (d.deadline && !isDate(d.deadline)) e.deadline = 'Формат: YYYY-MM-DD';
  }
  return e;
}

export default function AddForm({ type, onAdd }) {
  const isA = type === 'article';
  const [d, setD] = useState(
    isA
      ? { title: '', url: '/', type: 'review', status: 'planned', sessions: 0, clicks: 0, cr: 0 }
      : { title: '', type: 'review', priority: 'medium', deadline: '', status: 'idea' }
  );
  const [touched, setTouched] = useState({});
  const upd = (k, v) => { setD({ ...d, [k]: v }); setTouched({ ...touched, [k]: true }); };
  const errors = validate(d, isA);
  const shown = Object.fromEntries(Object.entries(errors).filter(([k]) => touched[k]));
  const disabled = Object.keys(errors).length > 0;

  const submit = () => {
    setTouched({ title: true, url: true, deadline: true });
    if (!disabled) onAdd(d);
  };

  return (
    <form
      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
      onSubmit={(e) => { e.preventDefault(); submit(); }}
    >
      <Field label={isA ? 'Заголовок' : 'Название'} required error={shown.title}>
        <Inp value={d.title} onChange={(v) => upd('title', v)} placeholder={isA ? 'Обзор De\'Longhi Magnifica S' : 'Обзор Saeco GranAroma'} invalid={!!shown.title} />
      </Field>

      {isA && (
        <Field label="URL slug" error={shown.url} hint="с ведущим и завершающим слэшем">
          <Inp value={d.url} onChange={(v) => upd('url', v)} placeholder="/obzor-saeco-granaroma/" invalid={!!shown.url} />
        </Field>
      )}

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <Field label="Тип" sx={{ flex: 1, minWidth: '140px' }}>
          <Sel value={d.type} onChange={(v) => upd('type', v)} opts={[
            { v: 'review', l: '📋 Обзор' }, { v: 'comparison', l: '⚖️ Сравнение' },
            { v: 'guide', l: '📖 Гайд' }, { v: 'quiz', l: '🎯 Квиз' },
            { v: 'tool', l: '🔧 Инструмент' },
          ]} />
        </Field>
        {isA ? (
          <Field label="Статус" sx={{ flex: 1, minWidth: '140px' }}>
            <Sel value={d.status} onChange={(v) => upd('status', v)} opts={[
              { v: 'planned', l: 'Planned' }, { v: 'draft', l: 'Draft' }, { v: 'published', l: 'Published' },
            ]} />
          </Field>
        ) : (
          <>
            <Field label="Приоритет" sx={{ flex: 1, minWidth: '120px' }}>
              <Sel value={d.priority} onChange={(v) => upd('priority', v)} opts={[
                { v: 'high', l: '🔴 High' }, { v: 'medium', l: '🟡 Med' }, { v: 'low', l: '🟢 Low' },
              ]} />
            </Field>
            <Field label="Статус" sx={{ flex: 1, minWidth: '130px' }}>
              <Sel value={d.status} onChange={(v) => upd('status', v)} opts={[
                { v: 'idea', l: 'Идея' }, { v: 'queued', l: 'Очередь' },
                { v: 'in_progress', l: 'В работе' }, { v: 'done', l: 'Готово' },
              ]} />
            </Field>
          </>
        )}
      </div>

      {!isA && (
        <Field label="Дедлайн" error={shown.deadline} hint="YYYY-MM-DD">
          <Inp value={d.deadline} onChange={(v) => upd('deadline', v)} placeholder="2026-04-25" type="date" invalid={!!shown.deadline} />
        </Field>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn type="submit" v="acc" disabled={disabled}>{isA ? 'Создать' : 'Добавить'}</Btn>
      </div>
    </form>
  );
}
