import { useEffect, useState } from 'react';

/**
 * Плавающая кнопка "Наверх" — показывается после скролла на N пикселей.
 * Автоматически скрывается когда ты наверху.
 */
export default function ScrollToTop({ threshold = 400 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="Наверх"
      aria-label="Наверх страницы"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontSize: 18,
        fontWeight: 800,
        boxShadow: '0 4px 14px rgba(59,130,246,.45)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      ↑
    </button>
  );
}
