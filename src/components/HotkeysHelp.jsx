import { Modal } from './ui.jsx';

const SHORTCUTS = [
  { group: 'Навигация', items: [
    { k: ['?'],       d: 'Эта справка' },
    { k: ['G', 'D'],  d: 'Перейти на Dashboard' },
    { k: ['G', 'S'],  d: 'Перейти в Settings' },
    { k: ['Esc'],     d: 'Закрыть модалку' },
  ]},
  { group: 'На Dashboard / SiteDetail', items: [
    { k: ['/'],       d: 'Фокус на AI-команду' },
    { k: ['N', 'A'],  d: 'Новая статья' },
    { k: ['N', 'P'],  d: 'Новый пункт плана' },
    { k: ['N', 'S'],  d: 'Новый сайт' },
    { k: ['1–9'],     d: 'Выбрать сайт по номеру' },
  ]},
];

export default function HotkeysHelp({ onClose }) {
  return (
    <Modal title="⌨️ Клавиатурные шорткаты" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {SHORTCUTS.map((g) => (
          <div key={g.group}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '6px' }}>
              {g.group}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {g.items.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1e293b' }}>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{s.d}</span>
                  <span style={{ display: 'flex', gap: '3px' }}>
                    {s.k.map((key, j) => (
                      <kbd key={j}>{key}</kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{ fontSize: '10px', color: '#475569', padding: '8px', background: '#0a0e17', borderRadius: '4px' }}>
          Последовательности вроде <kbd>G</kbd> <kbd>D</kbd> — нажимать по очереди, не одновременно.
          Шорткаты не работают пока курсор в поле ввода (кроме <kbd>Esc</kbd>).
        </div>
      </div>
    </Modal>
  );
}
