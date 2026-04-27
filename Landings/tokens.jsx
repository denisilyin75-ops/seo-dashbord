// Design tokens + shared primitives for the Landings dashboard.
// Solid, restrained, B2B-SaaS tool style. Deep navy accent on neutral.
// Exposes everything on `window` so other Babel script files can use it.

const TOKENS = {
  light: {
    // surfaces
    bg: '#fafafa',
    surface: '#ffffff',
    surfaceMuted: '#f5f5f4',
    surfaceSunken: '#f0f0ef',
    // borders
    border: '#e7e5e4',
    borderStrong: '#d6d3d1',
    borderSubtle: '#ededec',
    // text
    text: '#0c0a09',
    textMuted: '#57534e',
    textSubtle: '#78716c',
    textFaint: '#a8a29e',
    // accent — deep navy
    accent: '#1e3a8a',
    accentHover: '#1e40af',
    accentSoft: '#eef2ff',
    accentBorder: '#c7d2fe',
    accentText: '#1e3a8a',
    // semantic
    success: '#047857',
    successSoft: '#ecfdf5',
    warn: '#b45309',
    warnSoft: '#fffbeb',
    danger: '#b91c1c',
    dangerSoft: '#fef2f2',
    // dots / statuses
    dotPublished: '#10b981',
    dotDraft: '#a8a29e',
    dotError: '#ef4444',
    dotReview: '#f59e0b',
    // chart
    spark: '#1e3a8a',
    sparkMuted: '#a8a29e',
    sparkFill: 'rgba(30,58,138,0.08)',
    // shadow
    shadow: '0 1px 2px rgba(12,10,9,0.04)',
    shadowHover: '0 4px 12px rgba(12,10,9,0.08), 0 1px 2px rgba(12,10,9,0.06)',
    modalShadow: '0 24px 48px -12px rgba(12,10,9,0.25)',
  },
  dark: {
    bg: '#0a0a0a',
    surface: '#111111',
    surfaceMuted: '#161616',
    surfaceSunken: '#0c0c0c',
    border: '#232323',
    borderStrong: '#2e2e2e',
    borderSubtle: '#1c1c1c',
    text: '#f5f5f4',
    textMuted: '#a8a29e',
    textSubtle: '#78716c',
    textFaint: '#57534e',
    accent: '#818cf8',
    accentHover: '#a5b4fc',
    accentSoft: '#1e1b4b',
    accentBorder: '#312e81',
    accentText: '#a5b4fc',
    success: '#34d399',
    successSoft: '#022c22',
    warn: '#fbbf24',
    warnSoft: '#1c1917',
    danger: '#f87171',
    dangerSoft: '#1c1212',
    dotPublished: '#10b981',
    dotDraft: '#57534e',
    dotError: '#ef4444',
    dotReview: '#f59e0b',
    spark: '#818cf8',
    sparkMuted: '#57534e',
    sparkFill: 'rgba(129,140,248,0.12)',
    shadow: '0 1px 2px rgba(0,0,0,0.4)',
    shadowHover: '0 4px 12px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.4)',
    modalShadow: '0 24px 48px -12px rgba(0,0,0,0.6)',
  },
};

const ThemeContext = React.createContext({ t: TOKENS.light, theme: 'light', setTheme: () => {} });
const useTheme = () => React.useContext(ThemeContext);

// ── Icons — Lucide-style, thin strokes, 16/20/24 ────────────────
function Icon({ name, size = 16, stroke = 1.5, style }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    chevronDown: <><path d="m6 9 6 6 6-6" /></>,
    chevronRight: <><path d="m9 6 6 6-6 6" /></>,
    chevronLeft: <><path d="m15 6-6 6 6 6" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
    filter: <><path d="M3 6h18M7 12h10M10 18h4" /></>,
    sort: <><path d="M3 6h13M3 12h9M3 18h5M17 8V20m0 0-3-3m3 3 3-3" /></>,
    external: <><path d="M7 17 17 7M7 7h10v10" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>,
    check: <><path d="m5 12 5 5L20 7" /></>,
    // nav icons
    overview: <><path d="M3 12 12 4l9 8" /><path d="M5 10v10h14V10" /></>,
    folders: <><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    analytics: <><path d="M3 20h18" /><path d="M7 16V10" /><path d="M12 16V6" /><path d="M17 16v-4" /></>,
    forms: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 10h8M8 14h5" /></>,
    plug: <><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0z" /><path d="M12 18v4" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
    bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
    command: <><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
    moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></>,
    sidebar: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>,
    // statuses
    dot: <><circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" /></>,
    arrowUp: <><path d="M12 19V5M5 12l7-7 7 7" /></>,
    arrowDown: <><path d="M12 5v14M5 12l7 7 7-7" /></>,
    archive: <><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></>,
    pause: <><rect x="6" y="5" width="4" height="14" /><rect x="14" y="5" width="4" height="14" /></>,
    tag: <><path d="M20.6 13.4 13 20.9a2 2 0 0 1-2.8 0L3 13.8V3h10.8l6.8 6.8a2 2 0 0 1 0 2.6z" /><circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" /></>,
    inbox: <><path d="M3 13h4l2 3h6l2-3h4" /><path d="M5 5h14l2 8v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6z" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" /></>,
    folder: <><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    alertCircle: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></>,
    shield: <><path d="M12 2 4 5v7c0 5 4 9 8 10 4-1 8-5 8-10V5z" /></>,
    zap: <><path d="M13 2 3 14h8l-1 8 10-12h-8z" /></>,
    link: <><path d="M9 17H7a5 5 0 0 1 0-10h2M15 7h2a5 5 0 0 1 0 10h-2M8 12h8" /></>,
  };
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, display: 'block', ...style }}
      aria-hidden="true"
    >
      {paths[name] || null}
    </svg>
  );
}

// ── Button ──────────────────────────────────────────────────────
function Button({ variant = 'secondary', size = 'md', icon, iconRight, children, onClick, style, title, disabled }) {
  const { t } = useTheme();
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  const sizes = {
    sm: { h: 28, px: 10, fs: 12, gap: 6, iconSize: 14 },
    md: { h: 32, px: 12, fs: 13, gap: 6, iconSize: 14 },
    lg: { h: 40, px: 16, fs: 14, gap: 8, iconSize: 16 },
  }[size];

  let bg, fg, bd, sh;
  if (variant === 'primary') {
    bg = hover ? t.accentHover : t.accent;
    fg = '#ffffff';
    bd = bg;
    sh = 'inset 0 0 0 1px rgba(255,255,255,0.08), 0 1px 0 rgba(12,10,9,0.08)';
  } else if (variant === 'secondary') {
    bg = hover ? t.surfaceMuted : t.surface;
    fg = t.text;
    bd = t.borderStrong;
    sh = t.shadow;
  } else if (variant === 'ghost') {
    bg = hover ? t.surfaceMuted : 'transparent';
    fg = t.textMuted;
    bd = 'transparent';
    sh = 'none';
  } else if (variant === 'danger') {
    bg = hover ? '#991b1b' : t.danger;
    fg = '#fff'; bd = bg; sh = 'none';
  }

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        height: sizes.h,
        padding: `0 ${sizes.px}px`,
        fontSize: sizes.fs,
        fontWeight: 500,
        lineHeight: 1,
        color: fg,
        background: bg,
        border: `1px solid ${bd}`,
        borderRadius: 8,
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizes.gap,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'inherit',
        letterSpacing: '-0.005em',
        transform: active ? 'translateY(0.5px)' : 'none',
        transition: 'background 0.12s, transform 0.05s',
        boxShadow: sh,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={sizes.iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={sizes.iconSize} />}
    </button>
  );
}

// ── IconButton ──────────────────────────────────────────────────
function IconButton({ icon, onClick, title, size = 28, active, style }) {
  const { t } = useTheme();
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: size, height: size,
        padding: 0,
        background: active ? t.surfaceMuted : (hover ? t.surfaceMuted : 'transparent'),
        border: '1px solid transparent',
        borderColor: active ? t.border : 'transparent',
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: active ? t.text : t.textMuted,
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s',
        ...style,
      }}
      aria-label={title}
    >
      <Icon name={icon} size={size >= 32 ? 16 : 14} />
    </button>
  );
}

// ── Badge / Chip ────────────────────────────────────────────────
function Badge({ tone = 'neutral', children, icon, size = 'sm', style, title }) {
  const { t } = useTheme();
  const tones = {
    neutral: { bg: t.surfaceMuted, fg: t.textMuted, bd: t.border },
    accent:  { bg: t.accentSoft, fg: t.accentText, bd: t.accentBorder },
    success: { bg: t.successSoft, fg: t.success, bd: t.success },
    warn:    { bg: t.warnSoft, fg: t.warn, bd: t.warn },
    danger:  { bg: t.dangerSoft, fg: t.danger, bd: t.danger },
    ghost:   { bg: 'transparent', fg: t.textMuted, bd: t.border },
  };
  const ton = tones[tone];
  const sizes = {
    xs: { h: 18, fs: 11, px: 6, gap: 4 },
    sm: { h: 22, fs: 12, px: 8, gap: 5 },
    md: { h: 26, fs: 13, px: 10, gap: 6 },
  }[size];
  return (
    <span
      title={title}
      style={{
        height: sizes.h,
        padding: `0 ${sizes.px}px`,
        fontSize: sizes.fs,
        fontWeight: 500,
        color: ton.fg,
        background: ton.bg,
        border: `1px solid ${ton.bd}`,
        borderRadius: 6,
        display: 'inline-flex',
        alignItems: 'center',
        gap: sizes.gap,
        lineHeight: 1,
        letterSpacing: '-0.005em',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={11} />}
      {children}
    </span>
  );
}

// ── StatusDot ───────────────────────────────────────────────────
function StatusDot({ status = 'published', size = 8, ring }) {
  const { t } = useTheme();
  const color = { published: t.dotPublished, draft: t.dotDraft, error: t.dotError, review: t.dotReview, paused: t.textFaint }[status];
  return (
    <span style={{
      width: size, height: size, borderRadius: size,
      background: color, flexShrink: 0, display: 'inline-block',
      boxShadow: ring ? `0 0 0 3px ${color}22` : 'none',
    }} />
  );
}

// ── Sparkline ───────────────────────────────────────────────────
function Sparkline({ data, width = 80, height = 28, stroke, fill, flat }) {
  const { t } = useTheme();
  const s = stroke || t.spark;
  const f = fill === undefined ? t.sparkFill : fill;
  if (!data || !data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return [x, y];
  });
  const path = pts.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ');
  const area = path + ` L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      {f && <path d={area} fill={f} />}
      <path d={path} fill="none" stroke={s} strokeWidth={flat ? 1.25 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Segmented control ───────────────────────────────────────────
function Segmented({ options, value, onChange, size = 'md' }) {
  const { t } = useTheme();
  const h = size === 'sm' ? 26 : 30;
  return (
    <div style={{
      display: 'inline-flex',
      background: t.surfaceMuted,
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      padding: 2,
      height: h,
    }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              height: h - 6,
              padding: '0 10px',
              background: active ? t.surface : 'transparent',
              border: 'none',
              borderRadius: 6,
              color: active ? t.text : t.textMuted,
              fontSize: 12,
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
              boxShadow: active ? t.shadow : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              transition: 'background 0.12s, color 0.12s',
            }}
          >
            {o.icon && <Icon name={o.icon} size={13} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Kbd ─────────────────────────────────────────────────────────
function Kbd({ children, style }) {
  const { t } = useTheme();
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 18,
      height: 18,
      padding: '0 4px',
      fontSize: 11,
      fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
      fontWeight: 500,
      color: t.textMuted,
      background: t.surface,
      border: `1px solid ${t.border}`,
      borderRadius: 4,
      lineHeight: 1,
      ...style,
    }}>{children}</span>
  );
}

// Expose to other script files
Object.assign(window, {
  TOKENS, ThemeContext, useTheme,
  Icon, Button, IconButton, Badge, StatusDot, Sparkline, Segmented, Kbd,
});
