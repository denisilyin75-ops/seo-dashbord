/**
 * Обёртка для form-поля с label, required-меткой и inline-ошибкой.
 *
 * <Field label="Домен" required error={errors.name}>
 *   <Inp value={...} ... />
 * </Field>
 */
export default function Field({ label, required, error, hint, children, sx = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', ...sx }}>
      {label && (
        <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: error ? '#ef4444' : '#64748b' }}>
          {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        </div>
      )}
      {children}
      {error && (
        <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>⚠ {error}</div>
      )}
      {!error && hint && (
        <div style={{ fontSize: '10px', color: '#475569' }}>{hint}</div>
      )}
    </div>
  );
}

// ---------- Валидаторы ----------
export const isDomain = (v) => !!v && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(v.trim());
export const isUrl    = (v) => { try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };
export const isDate   = (v) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
export const isSlug   = (v) => !!v && /^\/[a-z0-9\-\/]+\/?$/i.test(v);
