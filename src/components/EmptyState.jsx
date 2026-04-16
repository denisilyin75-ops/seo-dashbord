/**
 * Пустое состояние с опциональными CTA-действиями.
 *
 * <EmptyState
 *    icon="📄"
 *    title="Нет статей"
 *    description="Добавьте первую или импортируйте из WordPress."
 *    actions={<><Btn v="acc">Добавить</Btn><Btn>Импорт</Btn></>}
 *  />
 */
export default function EmptyState({ icon = '📭', title, description, actions, sx = {} }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', background: '#0f172a', border: '1px dashed #1e293b', borderRadius: '8px', ...sx }}>
      <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.55 }}>{icon}</div>
      {title && (
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>
          {title}
        </div>
      )}
      {description && (
        <div style={{ fontSize: '12px', color: '#64748b', marginBottom: actions ? '16px' : 0, maxWidth: '400px', margin: actions ? '0 auto 16px' : '0 auto', lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      {actions && (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  );
}
