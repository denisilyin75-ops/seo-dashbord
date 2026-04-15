export const uid = () => Math.random().toString(36).slice(2, 9);

export const fmt = (n) => {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
};

export const now = () => new Date().toISOString();

export const d2s = (d) =>
  new Date(d).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
