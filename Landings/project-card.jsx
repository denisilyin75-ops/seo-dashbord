// Project card — the unit of the Projects grid.
// Status badge, counters, sparkline, last update, action menu.

const ProjectCard = ({ project, onOpen, viewMode = 'grid' }) => {
  const { t } = useTheme();
  const [hover, setHover] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const statusTone = {
    active: 'success',
    paused: 'neutral',
    archive: 'ghost',
  }[project.status];
  const statusLabel = { active: 'Активен', paused: 'На паузе', archive: 'Архив' }[project.status];

  if (viewMode === 'list') {
    return (
      <div
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        onClick={() => onOpen && onOpen(project)}
        style={{
          display: 'grid',
          gridTemplateColumns: '24px 1fr 140px 100px 100px 160px 32px',
          alignItems: 'center',
          gap: 16,
          padding: '14px 20px',
          borderBottom: `1px solid ${t.borderSubtle}`,
          background: hover ? t.surfaceMuted : 'transparent',
          cursor: 'pointer',
          transition: 'background .12s',
        }}
      >
        <div style={{ width: 24, height: 24, borderRadius: 6, background: project.color, color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '-0.02em' }}>
          {project.initials}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.text, letterSpacing: '-0.01em' }}>{project.name}</div>
            {project.archived && <Badge tone="ghost" size="xs">архив</Badge>}
          </div>
          <div style={{ fontSize: 12, color: t.textSubtle, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.description}</div>
        </div>
        <div style={{ fontSize: 12, color: t.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          {project.landings} лендингов
        </div>
        <div style={{ fontSize: 12, color: t.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          {project.domains} домена
        </div>
        <div style={{ fontSize: 12, color: t.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          {project.forms} форм
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkline data={project.spark} width={80} height={22} />
          <span style={{ fontSize: 12, fontWeight: 500, color: project.delta >= 0 ? t.success : t.danger, fontVariantNumeric: 'tabular-nums' }}>
            {project.delta >= 0 ? '+' : ''}{project.delta}%
          </span>
        </div>
        <IconButton icon="more" title="Действия" />
      </div>
    );
  }

  // GRID view
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={() => onOpen && onOpen(project)}
      style={{
        background: t.surface,
        border: `1px solid ${hover ? t.borderStrong : t.border}`,
        borderRadius: 12,
        padding: 20,
        cursor: 'pointer',
        transition: 'border-color .12s, box-shadow .12s, transform .12s',
        boxShadow: hover ? t.shadowHover : t.shadow,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        position: 'relative',
      }}
    >
      {/* Header — identity + status + menu */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: project.color,
          color: '#fff', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          letterSpacing: '-0.02em', flexShrink: 0,
        }}>
          {project.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: t.text, letterSpacing: '-0.015em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.name}
            </div>
          </div>
          <div style={{ fontSize: 12.5, color: t.textSubtle, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {project.description}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: hover ? 1 : 0.6, transition: 'opacity .12s' }}>
          <IconButton icon="more" title="Действия" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }} />
        </div>
      </div>

      {/* Counters row */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0,
        padding: '12px 0',
        borderTop: `1px solid ${t.borderSubtle}`,
        borderBottom: `1px solid ${t.borderSubtle}`,
      }}>
        {[
          { n: project.landings, l: 'лендингов' },
          { n: project.domains, l: 'домена' },
          { n: project.forms, l: 'форм' },
        ].map((c, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: i > 0 ? 16 : 0, borderLeft: i > 0 ? `1px solid ${t.borderSubtle}` : 'none' }}>
            <span style={{ fontSize: 18, fontWeight: 500, color: t.text, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{c.n}</span>
            <span style={{ fontSize: 11.5, color: t.textSubtle, textTransform: 'lowercase' }}>{c.l}</span>
          </div>
        ))}
      </div>

      {/* Footer — sparkline + metadata */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: t.textSubtle, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
            Визиты · 7 дней
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: t.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
              {project.visits.toLocaleString('ru-RU')}
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: project.delta >= 0 ? t.success : t.danger, fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
              <Icon name={project.delta >= 0 ? 'arrowUp' : 'arrowDown'} size={10} stroke={2} />
              {Math.abs(project.delta)}%
            </span>
          </div>
        </div>
        <Sparkline data={project.spark} width={92} height={32} />
      </div>

      {/* Bottom meta strip */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginTop: -6,
        paddingTop: 12,
        borderTop: `1px solid ${t.borderSubtle}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {project.status === 'active' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <StatusDot status="published" size={6} />
              <span style={{ fontSize: 11.5, color: t.textMuted }}>Активен</span>
            </div>
          )}
          {project.status === 'paused' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <StatusDot status="paused" size={6} />
              <span style={{ fontSize: 11.5, color: t.textMuted }}>На паузе</span>
            </div>
          )}
          {project.status === 'archive' && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <StatusDot status="draft" size={6} />
              <span style={{ fontSize: 11.5, color: t.textFaint }}>Архив</span>
            </div>
          )}
          {project.alert && (
            <>
              <span style={{ color: t.textFaint }}>·</span>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: t.warn, fontSize: 11.5, fontWeight: 500 }}>
                <Icon name="alertCircle" size={11} />
                {project.alert}
              </div>
            </>
          )}
        </div>
        <span style={{ fontSize: 11.5, color: t.textFaint }}>{project.updated}</span>
      </div>
    </div>
  );
};

Object.assign(window, { ProjectCard });
