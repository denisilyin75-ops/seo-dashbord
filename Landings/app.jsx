// Main app shell — sidebar, topbar, Projects grid.

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { t, theme, setTheme } = useTheme();
  const items = [
    { icon: 'overview', label: 'Обзор', count: null },
    { icon: 'folders', label: 'Проекты', count: 9, active: true },
    { icon: 'analytics', label: 'Аналитика', count: null },
    { icon: 'forms', label: 'Формы', count: 14, notif: true },
    { icon: 'plug', label: 'Интеграции', count: null },
    { icon: 'globe', label: 'Домены', count: null },
    { icon: 'activity', label: 'Активность', count: null },
    { icon: 'settings', label: 'Настройки', count: null },
  ];
  return (
    <aside style={{
      width: collapsed ? 60 : 232,
      height: '100vh',
      background: t.surface,
      borderRight: `1px solid ${t.border}`,
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky', top: 0,
      transition: 'width .18s',
      flexShrink: 0,
    }}>
      {/* Workspace */}
      <div style={{ padding: collapsed ? '16px 10px' : '16px', borderBottom: `1px solid ${t.borderSubtle}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: collapsed ? 0 : '6px 6px', borderRadius: 8, cursor: 'pointer' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: t.text, color: t.bg,
            fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            letterSpacing: '-0.02em', flexShrink: 0,
          }}>L</div>
          {!collapsed && <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: t.text, letterSpacing: '-0.01em' }}>Landings</div>
              <div style={{ fontSize: 11, color: t.textSubtle }}>Studio Workspace</div>
            </div>
            <Icon name="chevronDown" size={14} style={{ color: t.textSubtle }} />
          </>}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? '8px 6px' : '8px', overflowY: 'auto' }}>
        {items.map((it, i) => {
          const [hover, setHover] = [null, null];
          return (
            <a
              key={i}
              title={collapsed ? it.label : ''}
              onMouseEnter={(e) => { if (!it.active) e.currentTarget.style.background = t.surfaceMuted; }}
              onMouseLeave={(e) => { if (!it.active) e.currentTarget.style.background = 'transparent'; }}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 10,
                padding: collapsed ? 10 : '8px 10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 7,
                color: it.active ? t.text : t.textMuted,
                background: it.active ? t.surfaceMuted : 'transparent',
                fontSize: 13, fontWeight: it.active ? 500 : 400,
                letterSpacing: '-0.005em',
                textDecoration: 'none',
                cursor: 'pointer',
                marginBottom: 2,
                position: 'relative',
              }}
            >
              <Icon name={it.icon} size={16} stroke={it.active ? 1.75 : 1.5} />
              {!collapsed && <>
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.count !== null && (
                  <span style={{ fontSize: 11, color: t.textSubtle, fontVariantNumeric: 'tabular-nums' }}>{it.count}</span>
                )}
                {it.notif && <span style={{ width: 6, height: 6, borderRadius: 6, background: t.accent, marginLeft: -2 }} />}
              </>}
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? 8 : 10, borderTop: `1px solid ${t.borderSubtle}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {!collapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 7,
            cursor: 'pointer',
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = t.surfaceMuted}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ width: 24, height: 24, borderRadius: 20, background: t.accent, color: '#fff', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>АМ</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: t.text, fontWeight: 500 }}>Анна М.</div>
              <div style={{ fontSize: 11, color: t.textSubtle, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>owner · studio</div>
            </div>
            <Icon name="chevronDown" size={13} style={{ color: t.textSubtle }} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', gap: 4, padding: collapsed ? 0 : '0 4px' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.textSubtle, fontSize: 11 }}>
              <Icon name="command" size={12} />
              <span>⌘K</span>
              <span>команды</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 2 }}>
            <IconButton icon={theme === 'light' ? 'moon' : 'sun'} title="Тема" size={26} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} />
            <IconButton icon="sidebar" title="Свернуть" size={26} onClick={() => setCollapsed(!collapsed)} />
          </div>
        </div>
      </div>
    </aside>
  );
};

const TopBar = ({ onSearch }) => {
  const { t } = useTheme();
  const [focus, setFocus] = React.useState(false);
  return (
    <div style={{
      height: 56,
      borderBottom: `1px solid ${t.border}`,
      background: t.surface,
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '0 24px',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: t.textMuted }}>
        <span style={{ color: t.text, fontWeight: 500, letterSpacing: '-0.01em' }}>Проекты</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: focus ? t.surface : t.surfaceMuted,
        border: `1px solid ${focus ? t.accent : t.border}`,
        borderRadius: 8,
        height: 34, padding: '0 10px',
        width: 320,
        transition: 'border-color .12s, background .12s',
      }}>
        <Icon name="search" size={14} style={{ color: t.textSubtle }} />
        <input
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          placeholder="Поиск проектов, лендингов, доменов…"
          style={{
            flex: 1, border: 'none', background: 'transparent',
            fontFamily: 'inherit', fontSize: 13, color: t.text, outline: 'none',
            letterSpacing: '-0.005em',
          }}
        />
        <Kbd>⌘K</Kbd>
      </div>

      <IconButton icon="bell" title="Уведомления" size={32} />
    </div>
  );
};

const Filters = ({ view, setView, filterStatus, setFilterStatus, sort, setSort, tag, setTag }) => {
  const { t } = useTheme();
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [tagOpen, setTagOpen] = React.useState(false);

  const DropButton = ({ label, value, onClick, active }) => {
    const [hover, setHover] = React.useState(false);
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          height: 32, padding: '0 10px',
          background: active ? t.accentSoft : (hover ? t.surfaceMuted : t.surface),
          border: `1px solid ${active ? t.accentBorder : t.borderStrong}`,
          borderRadius: 8,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 12.5, fontWeight: 500,
          color: active ? t.accentText : t.textMuted,
          cursor: 'pointer', fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          letterSpacing: '-0.005em',
        }}
      >
        {label}
        {value && <span style={{ color: active ? t.accentText : t.text }}>· {value}</span>}
        <Icon name="chevronDown" size={12} />
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <DropButton
        label="Статус"
        value={filterStatus === 'all' ? null : { active: 'Активные', paused: 'На паузе', archive: 'Архив' }[filterStatus]}
        active={filterStatus !== 'all'}
        onClick={() => {
          const next = { all: 'active', active: 'paused', paused: 'archive', archive: 'all' }[filterStatus];
          setFilterStatus(next);
        }}
      />
      <DropButton label="Тег" value={tag || null} active={!!tag} onClick={() => {
        setTag(tag ? '' : 'ecommerce');
      }} />
      <DropButton label="Клиент" active={false} onClick={() => {}} />

      <div style={{ width: 1, height: 22, background: t.border, margin: '0 4px' }} />

      <DropButton label="Сортировка" value={{ updated: 'По дате', visits: 'По трафику', name: 'По имени' }[sort]} onClick={() => {
        const next = { updated: 'visits', visits: 'name', name: 'updated' }[sort];
        setSort(next);
      }} />

      <div style={{ flex: 1 }} />

      <Segmented
        options={[
          { value: 'grid', icon: 'grid', label: '' },
          { value: 'list', icon: 'list', label: '' },
        ]}
        value={view}
        onChange={setView}
      />
    </div>
  );
};

const EmptyState = () => {
  const { t } = useTheme();
  return (
    <div style={{
      gridColumn: '1 / -1',
      padding: '80px 40px',
      border: `1px dashed ${t.borderStrong}`,
      borderRadius: 12,
      background: t.surface,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 20,
      textAlign: 'center',
    }}>
      {/* Minimal illustration */}
      <div style={{ position: 'relative', width: 88, height: 88 }}>
        <div style={{ position: 'absolute', inset: 0, border: `1px solid ${t.border}`, borderRadius: 12, background: t.surfaceMuted, transform: 'rotate(-6deg) translate(-8px, 4px)' }} />
        <div style={{ position: 'absolute', inset: 0, border: `1px solid ${t.border}`, borderRadius: 12, background: t.surface, transform: 'rotate(4deg) translate(6px, -2px)' }} />
        <div style={{ position: 'absolute', inset: 0, border: `1px solid ${t.borderStrong}`, borderRadius: 12, background: t.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.textMuted }}>
          <Icon name="folder" size={28} stroke={1.25} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 500, color: t.text, letterSpacing: '-0.01em', marginBottom: 6 }}>
          Ещё нет проектов
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, maxWidth: 380, lineHeight: 1.5 }}>
          Проект группирует лендинги одного клиента или кампании. Внутри — общие домены, формы и метрики.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="primary" icon="plus">Создать проект</Button>
        <Button variant="secondary">Документация</Button>
      </div>
    </div>
  );
};

const ProjectsScreen = ({ showEmpty }) => {
  const { t } = useTheme();
  const [view, setView] = React.useState('grid');
  const [filterStatus, setFilterStatus] = React.useState('all');
  const [sort, setSort] = React.useState('updated');
  const [tag, setTag] = React.useState('');

  const filtered = React.useMemo(() => {
    let r = [...PROJECTS];
    if (filterStatus !== 'all') r = r.filter(p => p.status === filterStatus);
    if (sort === 'visits') r.sort((a, b) => b.visits - a.visits);
    if (sort === 'name') r.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    return r;
  }, [filterStatus, sort]);

  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '32px 32px 80px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 500, color: t.text, letterSpacing: '-0.02em', margin: 0, marginBottom: 6 }}>
            Проекты
          </h1>
          <p style={{ fontSize: 13.5, color: t.textMuted, margin: 0 }}>
            {PROJECTS.length} проектов · {PROJECTS.reduce((s, p) => s + p.landings, 0)} лендингов · {PROJECTS.reduce((s, p) => s + p.forms, 0)} форм
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" icon="filter">Импорт из Claude Code</Button>
          <Button variant="primary" icon="plus">Новый проект</Button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 20 }}>
        <Filters view={view} setView={setView} filterStatus={filterStatus} setFilterStatus={setFilterStatus} sort={sort} setSort={setSort} tag={tag} setTag={setTag} />
      </div>

      {/* Grid / List / Empty */}
      {showEmpty ? (
        <EmptyState />
      ) : view === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: 16,
        }}>
          {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      ) : (
        <div style={{ border: `1px solid ${t.border}`, borderRadius: 12, background: t.surface, overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '24px 1fr 140px 100px 100px 160px 32px',
            alignItems: 'center',
            gap: 16,
            padding: '10px 20px',
            borderBottom: `1px solid ${t.border}`,
            background: t.surfaceMuted,
            fontSize: 11, fontWeight: 500, color: t.textSubtle,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            <span />
            <span>Проект</span>
            <span>Лендинги</span>
            <span>Домены</span>
            <span>Формы</span>
            <span>Визиты · 7д</span>
            <span />
          </div>
          {filtered.map(p => <ProjectCard key={p.id} project={p} viewMode="list" />)}
        </div>
      )}
    </div>
  );
};

// ── Tweaks panel ──────────────────────────────────────────────
const TweaksPanel = ({ tweaks, setTweaks, visible }) => {
  const { t } = useTheme();
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20,
      width: 260,
      background: t.surface,
      border: `1px solid ${t.borderStrong}`,
      borderRadius: 12,
      padding: 14,
      boxShadow: t.modalShadow,
      zIndex: 100,
      fontFamily: 'inherit',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, letterSpacing: '-0.01em', marginBottom: 10, textTransform: 'uppercase' }}>Tweaks</div>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, color: t.text, cursor: 'pointer' }}>
        <span>Показать empty state</span>
        <input type="checkbox" checked={tweaks.emptyState} onChange={e => setTweaks({ ...tweaks, emptyState: e.target.checked })} />
      </label>
    </div>
  );
};

// ── Root ──────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "emptyState": false
}/*EDITMODE-END*/;

function App() {
  const [theme, setTheme] = React.useState(() => {
    try { return localStorage.getItem('landings.theme') || TWEAK_DEFAULTS.theme; } catch { return TWEAK_DEFAULTS.theme; }
  });
  const [collapsed, setCollapsed] = React.useState(false);
  const [tweaksVisible, setTweaksVisible] = React.useState(false);
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);

  React.useEffect(() => {
    try { localStorage.setItem('landings.theme', theme); } catch {}
  }, [theme]);

  // Tweaks protocol
  React.useEffect(() => {
    const handler = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setTweaksVisible(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksVisible(false);
    };
    window.addEventListener('message', handler);
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*'); } catch {}
    return () => window.removeEventListener('message', handler);
  }, []);

  const t = TOKENS[theme];

  return (
    <ThemeContext.Provider value={{ t, theme, setTheme }}>
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        background: t.bg,
        color: t.text,
        fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontSize: 14,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        letterSpacing: '-0.005em',
      }}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <TopBar />
          <ProjectsScreen showEmpty={tweaks.emptyState} />
        </main>
        <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} visible={tweaksVisible} />
      </div>
    </ThemeContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
