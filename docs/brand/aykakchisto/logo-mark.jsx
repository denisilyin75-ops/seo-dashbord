// Logo mark — stylized Cyrillic "А" with exhale-curve crossbar.
// Concept: the horizontal bar of the А is replaced by a soft sine-like curve
// that reads as an exhale / airflow line. The letter itself becomes a house
// silhouette (triangular roof) — so the mark quietly holds two ideas:
//   "А" for Ай как чисто, and a home with breath moving through it.
// Accent dot (orange-copper) sits where the breath exits — a single, calm punctuation.

const INK    = '#1E3A5F';
const COPPER = '#E8A04C';
const PAPER  = '#F4F6F8';

// The symbol — viewBox 100x100, geometrically constructed.
// Stroke weights tuned for legibility down to 32px.
function LogoMark({ size = 128, fg = INK, accent = COPPER, showAccent = true, strokeScale = 1 }) {
  const s = 10 * strokeScale; // primary stroke width
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* Left leg of А  — from baseline (18,86) up to apex (50,14) */}
      <line x1="18" y1="86" x2="50" y2="14" stroke={fg} strokeWidth={s} strokeLinecap="round" />
      {/* Right leg */}
      <line x1="50" y1="14" x2="82" y2="86" stroke={fg} strokeWidth={s} strokeLinecap="round" />
      {/* Exhale crossbar — gentle S curve, enters low-left, rises, exits slightly higher right.
          Reads as airflow / breath, not a rigid horizontal. */}
      <path
        d="M 30 62 C 40 54, 48 66, 58 58 S 72 54, 72 54"
        stroke={fg}
        strokeWidth={s * 0.72}
        strokeLinecap="round"
        fill="none"
      />
      {/* Accent: a single copper dot at the exit of the exhale — the "breath point".
          This is the one-and-only use of the accent color. */}
      {showAccent && (
        <circle cx="72" cy="54" r={s * 0.58} fill={accent} />
      )}
    </svg>
  );
}

// Wordmark: "ай как чисто!" — lowercase, humanist sans, Unbounded Medium.
// The "!" stem uses ink; its dot is the copper accent in the primary lockup
// OR stays ink when the symbol already carries the accent (we keep accent single-use).
function Wordmark({ size = 48, color = INK, accentExclamation = false, accent = COPPER }) {
  return (
    <span style={{
      fontFamily: '"Unbounded", "Inter", sans-serif',
      fontWeight: 500,
      fontSize: size,
      color,
      letterSpacing: '-0.01em',
      lineHeight: 1,
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'baseline',
    }}>
      <span>ай&nbsp;как&nbsp;чисто</span>
      <span style={{ color: accentExclamation ? accent : color }}>!</span>
    </span>
  );
}

// Tagline: "Дом, в котором дышится" — editorial, quiet.
function Tagline({ size = 14, color = INK, opacity = 0.6 }) {
  return (
    <div style={{
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      fontWeight: 400,
      fontSize: size,
      color,
      opacity,
      letterSpacing: '0.04em',
      lineHeight: 1.3,
    }}>
      Дом, в котором дышится
    </div>
  );
}

// Primary horizontal lockup
function LockupHorizontal({ bg = PAPER, fg = INK, accent = COPPER, showTagline = true }) {
  return (
    <div style={{
      width: '100%', height: '100%',
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 72px',
      boxSizing: 'border-box',
      gap: 28,
    }}>
      <LogoMark size={112} fg={fg} accent={accent} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Wordmark size={44} color={fg} accentExclamation={false} accent={accent} />
        {showTagline && <Tagline color={fg} size={14} opacity={0.62} />}
      </div>
    </div>
  );
}

// Stacked lockup — symbol above wordmark
function LockupStacked({ bg = PAPER, fg = INK, accent = COPPER }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 40, boxSizing: 'border-box', gap: 22,
    }}>
      <LogoMark size={140} fg={fg} accent={accent} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <Wordmark size={38} color={fg} />
        <Tagline color={fg} size={13} opacity={0.6} />
      </div>
    </div>
  );
}

// Symbol-only, centered
function SymbolTile({ bg = PAPER, fg = INK, accent = COPPER, size = 180, showAccent = true }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <LogoMark size={size} fg={fg} accent={accent} showAccent={showAccent} />
    </div>
  );
}

// Favicon grid — 128, 64, 32, 16 — to prove small-size legibility
function FaviconRow() {
  const sizes = [128, 64, 32, 16];
  return (
    <div style={{
      width: '100%', height: '100%', background: PAPER,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 36, padding: 24, boxSizing: 'border-box',
    }}>
      {sizes.map(sz => (
        <div key={sz} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: sz, height: sz,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: PAPER,
            // subtle square so we can see the bounding box at small sizes
            boxShadow: sz <= 32 ? 'inset 0 0 0 1px rgba(30,58,95,0.1)' : 'none',
          }}>
            {/* scale stroke slightly thicker at tiny sizes for optical clarity */}
            <LogoMark
              size={sz}
              strokeScale={sz <= 32 ? 1.15 : 1}
              showAccent={sz >= 24}
            />
          </div>
          <div style={{
            fontFamily: '"JetBrains Mono", "IBM Plex Mono", monospace',
            fontSize: 10, color: INK, opacity: 0.45, letterSpacing: '0.06em',
          }}>{sz}px</div>
        </div>
      ))}
    </div>
  );
}

// Editorial context — brand-in-use mock (masthead strip)
function MastheadMock() {
  return (
    <div style={{
      width: '100%', height: '100%', background: PAPER,
      display: 'flex', flexDirection: 'column',
      boxSizing: 'border-box',
    }}>
      {/* thin top bar */}
      <div style={{
        padding: '18px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(30,58,95,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LogoMark size={36} />
          <Wordmark size={18} />
        </div>
        <div style={{
          display: 'flex', gap: 26,
          fontFamily: '"Inter", sans-serif', fontSize: 12,
          color: INK, opacity: 0.7, letterSpacing: '0.04em',
        }}>
          <span>Эссе</span><span>Химия дома</span><span>Ритуалы</span><span>Об авторе</span>
        </div>
      </div>

      {/* editorial body */}
      <div style={{ padding: '44px 32px 32px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{
          fontFamily: '"Inter", sans-serif', fontSize: 11,
          color: COPPER, letterSpacing: '0.14em', textTransform: 'uppercase',
          fontWeight: 500,
        }}>№ 07 · Эссе</div>
        <div style={{
          fontFamily: '"Unbounded", sans-serif', fontSize: 26, fontWeight: 500,
          color: INK, lineHeight: 1.15, letterSpacing: '-0.01em', maxWidth: 420,
        }}>
          Почему в чистой квартире легче&nbsp;думать
        </div>
        <div style={{
          fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 14,
          color: INK, opacity: 0.75, lineHeight: 1.55, maxWidth: 480,
        }}>
          Дарья Метёлкина — химик по образованию — о том, как запах
          лимонной кислоты на кухне делает разговоры спокойнее.
        </div>
      </div>
    </div>
  );
}

// "What we avoided" — documents the rejection criteria as a diagnostic panel.
function RejectionPanel() {
  const items = [
    'Резиновые перчатки, распылители',
    'Блёстки и звёздочки',
    'Градиенты, 3D-глянец',
    'Акварельные пятна',
    'Латиница «Ay Kak Chisto»',
    'Пастельно-мятные оттенки',
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: PAPER,
      padding: 28, boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        fontFamily: '"Unbounded", sans-serif', fontSize: 13, fontWeight: 500,
        color: INK, letterSpacing: '0.02em',
      }}>Чего в марке нет</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map(t => (
          <div key={t} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            fontFamily: '"Inter", sans-serif', fontSize: 13,
            color: INK, opacity: 0.75,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14">
              <line x1="3" y1="3" x2="11" y2="11" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
              <line x1="11" y1="3" x2="3" y2="11" stroke={INK} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            </svg>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

// Construction diagram — shows the geometric bones of the mark.
function ConstructionPanel() {
  return (
    <div style={{
      width: '100%', height: '100%', background: PAPER,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <svg width="260" height="260" viewBox="0 0 100 100">
        {/* grid */}
        {[10,20,30,40,50,60,70,80,90].map(v => (
          <g key={v}>
            <line x1={v} y1="0" x2={v} y2="100" stroke={INK} strokeWidth="0.15" opacity="0.2" />
            <line x1="0" y1={v} x2="100" y2={v} stroke={INK} strokeWidth="0.15" opacity="0.2" />
          </g>
        ))}
        {/* baselines */}
        <line x1="0" y1="14" x2="100" y2="14" stroke={COPPER} strokeWidth="0.3" strokeDasharray="1,1" opacity="0.8" />
        <line x1="0" y1="86" x2="100" y2="86" stroke={COPPER} strokeWidth="0.3" strokeDasharray="1,1" opacity="0.8" />
        {/* apex guides */}
        <circle cx="50" cy="14" r="1.2" fill={COPPER} />
        <circle cx="18" cy="86" r="1.2" fill={COPPER} />
        <circle cx="82" cy="86" r="1.2" fill={COPPER} />
        {/* the actual mark on top */}
        <line x1="18" y1="86" x2="50" y2="14" stroke={INK} strokeWidth="10" strokeLinecap="round" />
        <line x1="50" y1="14" x2="82" y2="86" stroke={INK} strokeWidth="10" strokeLinecap="round" />
        <path d="M 30 62 C 40 54, 48 66, 58 58 S 72 54, 72 54"
              stroke={INK} strokeWidth="7.2" strokeLinecap="round" fill="none" />
        <circle cx="72" cy="54" r="5.8" fill={COPPER} />
      </svg>
      <div style={{
        position: 'absolute', bottom: 18, left: 0, right: 0,
        textAlign: 'center',
        fontFamily: '"JetBrains Mono", monospace', fontSize: 10,
        color: INK, opacity: 0.5, letterSpacing: '0.08em',
      }}>apex 50,14 · base 18,86 / 82,86 · exhale s-curve 30→72</div>
    </div>
  );
}

Object.assign(window, {
  LogoMark, Wordmark, Tagline,
  LockupHorizontal, LockupStacked, SymbolTile,
  FaviconRow, MastheadMock, RejectionPanel, ConstructionPanel,
  INK, COPPER, PAPER,
});
