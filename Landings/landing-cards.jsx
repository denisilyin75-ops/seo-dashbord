// Two directions for the Landing Card component study.
//
// Direction A — "Dossier"
//   Small preview, info-dense. Metrics in a tight tabular row,
//   badges as monochrome chips, quick actions always visible
//   at the bottom. Built for scanning many at once.
//
// Direction B — "Preview-forward"
//   Large 16:9 screenshot as the hero. Meta chips overlay the
//   preview sparingly. Info rail below is quieter; actions live
//   on hover. Built for visual review and design pride.

// ── Placeholder landing preview (abstract SVG) ────────────────
const LANDING_PREVIEWS = {
  bf: { bg: '#0a0a0a', accent: '#f5e8c7', title: 'BLACK FRIDAY', sub: '—70% только сегодня' },
  fit: { bg: '#f0ede4', accent: '#1f2937', title: 'Северный квартал', sub: 'Жилой комплекс · продажи открыты' },
  clinic: { bg: '#ecfdf5', accent: '#065f46', title: 'Имплантация зубов', sub: 'Консультация бесплатно' },
  dark: { bg: '#111827', accent: '#818cf8', title: 'Horizon Card', sub: 'Новая дебетовая · 6% кэшбэк' },
  retail: { bg: '#fef3c7', accent: '#92400e', title: 'Зимняя коллекция', sub: 'Northwind · декабрь' },
};

function LandingPreview({ variant = 'bf', rounded = 6, style }) {
  const p = LANDING_PREVIEWS[variant] || LANDING_PREVIEWS.bf;
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      borderRadius: rounded,
      background: p.bg,
      aspectRatio: '16 / 10',
      ...style,
    }}>
      {/* Faux browser chrome */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 14,
        background: 'rgba(255,255,255,0.06)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 3, padding: '0 6px',
      }}>
        {[0, 1, 2].map(i => <span key={i} style={{ width: 4, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.18)' }} />)}
      </div>
      {/* Content mock */}
      <div style={{ position: 'absolute', inset: '22px 14px 14px' }}>
        <div style={{ fontFamily: 'IBM Plex Sans', fontWeight: 600, fontSize: 13, color: p.accent, letterSpacing: '-0.02em', lineHeight: 1.05 }}>{p.title}</div>
        <div style={{ fontFamily: 'IBM Plex Sans', fontSize: 8.5, color: p.accent, opacity: 0.7, marginTop: 3 }}>{p.sub}</div>
        {/* Mock blocks */}
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ height: 3, background: p.accent, opacity: 0.18, borderRadius: 2, width: '80%' }} />
          <div style={{ height: 3, background: p.accent, opacity: 0.14, borderRadius: 2, width: '65%' }} />
          <div style={{ height: 3, background: p.accent, opacity: 0.12, borderRadius: 2, width: '72%' }} />
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ height: 10, padding: '0 6px', background: p.accent, color: p.bg, borderRadius: 2, fontSize: 6, fontWeight: 600, display: 'flex', alignItems: 'center', letterSpacing: '0.02em' }}>ОСТАВИТЬ ЗАЯВКУ</div>
          <div style={{ height: 10, padding: '0 6px', border: `0.5px solid ${p.accent}`, opacity: 0.5, color: p.accent, borderRadius: 2, fontSize: 6, fontWeight: 500, display: 'flex', alignItems: 'center' }}>Подробнее</div>
        </div>
      </div>
    </div>
  );
}

// ── Pixel badges (counter logos, monochrome) ──────────────────
function PixelBadge({ which, active = true, size = 18 }) {
  const { t } = useTheme();
  const labels = {
    ga: 'GA', ym: 'ЯМ', vk: 'VK', meta: 'M', tt: 'TT', gtm: 'GTM',
  };
  return (
    <div
      title={{ ga: 'Google Analytics', ym: 'Яндекс.Метрика', vk: 'VK Pixel', meta: 'Meta Pixel', tt: 'TikTok Pixel', gtm: 'Google Tag Manager' }[which]}
      style={{
        height: size, minWidth: size,
        padding: '0 5px',
        borderRadius: 4,
        border: `1px solid ${active ? t.border : t.borderSubtle}`,
        background: active ? t.surfaceMuted : 'transparent',
        color: active ? t.textMuted : t.textFaint,
        fontSize: 9.5, fontWeight: 600,
        letterSpacing: '0.02em',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      }}
    >
      {labels[which]}
    </div>
  );
}

// ── Direction A: Dossier ──────────────────────────────────────
function LandingCardA({ data }) {
  const { t } = useTheme();
  const [hover, setHover] = React.useState(false);

  const statusColor = {
    published: t.dotPublished, draft: t.dotDraft, error: t.dotError, review: t.dotReview,
  }[data.status];
  const statusLabel = {
    published: 'Опубликован', draft: 'Черновик', error: 'Ошибка деплоя', review: 'На проверке',
  }[data.status];
  const convTone = data.conversion > 5 ? t.success : data.conversion > 2 ? t.text : t.warn;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: t.surface,
        border: `1px solid ${hover ? t.borderStrong : t.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        transition: 'border-color .12s, box-shadow .12s',
        boxShadow: hover ? t.shadowHover : t.shadow,
        cursor: 'default',
      }}
    >
      {/* Top: small preview + main info */}
      <div style={{ padding: 16, display: 'flex', gap: 14 }}>
        <div style={{ width: 120, flexShrink: 0 }}>
          <LandingPreview variant={data.preview} rounded={6} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <StatusDot status={data.status} size={7} />
                <div style={{ fontSize: 14.5, fontWeight: 500, color: t.text, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {data.name}
                </div>
              </div>
              <div style={{
                fontSize: 12, color: t.textSubtle,
                fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
                display: 'flex', alignItems: 'center', gap: 6,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.url}</span>
                <Icon name="copy" size={11} style={{ color: t.textFaint, cursor: 'pointer', flexShrink: 0 }} />
              </div>
            </div>
            <IconButton icon="more" size={26} />
          </div>
          <div style={{ fontSize: 11.5, color: t.textFaint, marginTop: 'auto' }}>
            {statusLabel} · {data.updated}
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderTop: `1px solid ${t.borderSubtle}`,
      }}>
        {[
          { label: 'Визиты', value: data.visits.toLocaleString('ru-RU'), color: t.text, delta: data.visitsDelta },
          { label: 'Заявки', value: data.leads, color: t.text, delta: data.leadsDelta },
          { label: 'Конверсия', value: data.conversion.toFixed(1) + '%', color: convTone, delta: data.convDelta },
        ].map((m, i) => (
          <div key={i} style={{
            padding: '10px 14px',
            borderLeft: i > 0 ? `1px solid ${t.borderSubtle}` : 'none',
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            <div style={{ fontSize: 10.5, color: t.textSubtle, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              {m.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 500, color: m.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{m.value}</span>
              {m.delta !== undefined && (
                <span style={{ fontSize: 11, color: m.delta >= 0 ? t.success : t.danger, fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                  {m.delta >= 0 ? '+' : ''}{m.delta}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Badges row */}
      <div style={{
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderTop: `1px solid ${t.borderSubtle}`,
        background: t.surfaceSunken,
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {data.pixels.map(p => <PixelBadge key={p} which={p} />)}
        </div>
        <div style={{ width: 1, height: 14, background: t.border }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: t.textMuted }}>
          <Icon name="forms" size={12} style={{ color: t.textSubtle }} />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{data.forms}</span>
          <span>форм</span>
        </div>
        {data.crm && <>
          <div style={{ width: 1, height: 14, background: t.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: t.textMuted }}>
            <Icon name="link" size={12} style={{ color: t.textSubtle }} />
            <span>{data.crm}</span>
          </div>
        </>}
        {data.warning && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: t.warn, fontWeight: 500 }}>
            <Icon name="alertCircle" size={12} />
            {data.warning}
          </div>
        )}
      </div>

      {/* Actions row — always visible */}
      <div style={{
        padding: '8px 10px',
        display: 'flex', alignItems: 'center', gap: 4,
        borderTop: `1px solid ${t.borderSubtle}`,
      }}>
        <Button variant="ghost" size="sm" icon="edit">Настройки</Button>
        <Button variant="ghost" size="sm" icon="search">Превью</Button>
        <Button variant="ghost" size="sm" icon="external">Открыть</Button>
        <div style={{ flex: 1 }} />
        {data.status === 'draft' && <Button variant="primary" size="sm">Опубликовать</Button>}
      </div>
    </div>
  );
}

// ── Direction B: Preview-forward ──────────────────────────────
function LandingCardB({ data }) {
  const { t } = useTheme();
  const [hover, setHover] = React.useState(false);

  const statusLabel = {
    published: 'Опубликован', draft: 'Черновик', error: 'Ошибка', review: 'На проверке',
  }[data.status];

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: t.surface,
        border: `1px solid ${hover ? t.borderStrong : t.border}`,
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'border-color .12s, box-shadow .12s, transform .12s',
        boxShadow: hover ? t.shadowHover : t.shadow,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Large preview */}
      <div style={{ position: 'relative', borderBottom: `1px solid ${t.borderSubtle}` }}>
        <LandingPreview variant={data.preview} rounded={0} style={{ aspectRatio: '16/9' }} />

        {/* Status pill, top-left overlay */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          height: 22, padding: '0 8px',
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 6,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11.5, fontWeight: 500, color: t.text,
          backdropFilter: 'blur(8px)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <StatusDot status={data.status} size={6} />
          {statusLabel}
        </div>

        {/* Hover overlay with device toggle + actions */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(10,10,10,0.55)',
          opacity: hover ? 1 : 0,
          transition: 'opacity .15s',
          pointerEvents: hover ? 'auto' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8,
        }}>
          <button style={{
            height: 32, padding: '0 14px',
            background: t.surface,
            border: `1px solid ${t.borderStrong}`,
            borderRadius: 8,
            fontSize: 12.5, fontWeight: 500, color: t.text,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <Icon name="edit" size={13} />
            Настройки
          </button>
          <button style={{
            height: 32, padding: '0 14px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 8,
            fontSize: 12.5, fontWeight: 500, color: '#fff',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            backdropFilter: 'blur(8px)',
          }}>
            <Icon name="external" size={13} />
            Открыть
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: t.text, letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.name}
            </div>
            <div style={{
              fontSize: 12, color: t.textSubtle, marginTop: 3,
              fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
              display: 'flex', alignItems: 'center', gap: 6,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.url}</span>
              <Icon name="copy" size={11} style={{ color: t.textFaint, cursor: 'pointer', flexShrink: 0 }} />
            </div>
          </div>
          <IconButton icon="more" size={26} />
        </div>

        {/* Mini metrics, inline */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          fontSize: 12.5, color: t.textMuted,
          fontVariantNumeric: 'tabular-nums',
        }}>
          <span><span style={{ color: t.text, fontWeight: 500 }}>{data.visits.toLocaleString('ru-RU')}</span> визитов</span>
          <span style={{ color: t.borderStrong }}>·</span>
          <span><span style={{ color: t.text, fontWeight: 500 }}>{data.leads}</span> заявок</span>
          <span style={{ color: t.borderStrong }}>·</span>
          <span><span style={{ color: t.text, fontWeight: 500 }}>{data.conversion.toFixed(1)}%</span> CR</span>
        </div>

        {/* Pixel badges + warning */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {data.pixels.map(p => <PixelBadge key={p} which={p} size={18} />)}
          </div>
          {data.warning && (
            <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: t.warn, fontWeight: 500 }}>
              <Icon name="alertCircle" size={12} />
              {data.warning}
            </div>
          )}
          {!data.warning && (
            <span style={{ marginLeft: 'auto', fontSize: 11.5, color: t.textFaint }}>{data.updated}</span>
          )}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { LandingCardA, LandingCardB, LandingPreview, PixelBadge });
