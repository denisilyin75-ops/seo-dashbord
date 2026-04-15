// Статусы: label + color
export const ST = {
  published:   { l: 'Live',     c: '#34d399' },
  draft:       { l: 'Draft',    c: '#fbbf24' },
  planned:     { l: 'Plan',     c: '#818cf8' },
  active:      { l: 'Active',   c: '#34d399' },
  setup:       { l: 'Setup',    c: '#fbbf24' },
  in_progress: { l: 'WIP',      c: '#fbbf24' },
  queued:      { l: 'Queue',    c: '#818cf8' },
  idea:        { l: 'Idea',     c: '#94a3b8' },
  deploying:   { l: 'Deploy...',c: '#f97316' },
  deployed:    { l: 'Deployed', c: '#34d399' },
  failed:      { l: 'Failed',   c: '#ef4444' },
};

// Иконки по типу контента
export const TI = {
  review:     '📋',
  comparison: '⚖️',
  guide:      '📖',
  quiz:       '🎯',
  tool:       '🔧',
  category:   '📁',
};

// Цвета приоритетов
export const PC = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
