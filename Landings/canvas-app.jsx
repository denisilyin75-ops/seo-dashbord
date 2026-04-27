// Canvas page — side-by-side comparison of Landing Card directions,
// plus the Project Card for system context.

const LANDINGS_SAMPLE = [
  {
    id: 'l1', name: 'Чёрная пятница · ноябрь', url: 'acme.ru/bf-2025',
    preview: 'bf', status: 'published',
    visits: 12840, visitsDelta: 24, leads: 418, leadsDelta: 31,
    conversion: 3.3, convDelta: 0.4,
    pixels: ['ga', 'ym', 'vk', 'meta'], forms: 2, crm: 'amoCRM',
    updated: 'изменён 2 ч назад', warning: null,
  },
  {
    id: 'l2', name: 'Северный квартал · продажи', url: 'sevmet.ru/sk',
    preview: 'fit', status: 'published',
    visits: 4210, visitsDelta: 8, leads: 62, leadsDelta: -4,
    conversion: 1.5, convDelta: -0.2,
    pixels: ['ga', 'ym'], forms: 1, crm: 'Bitrix24',
    updated: 'изменён вчера', warning: null,
  },
  {
    id: 'l3', name: 'Имплантация · акция марта', url: 'bm-clinic.ru/implants',
    preview: 'clinic', status: 'review',
    visits: 860, visitsDelta: 0, leads: 18, leadsDelta: 0,
    conversion: 2.1, convDelta: 0,
    pixels: ['ga', 'ym', 'vk'], forms: 1, crm: null,
    updated: 'изменён 20 мин назад', warning: 'Metrika · нет хитов 7 дней',
  },
  {
    id: 'l4', name: 'Horizon Card · регистрация', url: 'horizon.finance/card',
    preview: 'dark', status: 'draft',
    visits: 0, visitsDelta: 0, leads: 0, leadsDelta: 0,
    conversion: 0, convDelta: 0,
    pixels: ['ga', 'meta', 'gtm'], forms: 1, crm: 'HubSpot',
    updated: 'черновик · 3 дня назад', warning: null,
  },
];

// ── Section: Landing Card — Direction A (Dossier) ─────────────
function DossierBoard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 520, padding: 20, background: 'transparent' }}>
      {LANDINGS_SAMPLE.slice(0, 3).map(l => <LandingCardA key={l.id} data={l} />)}
    </div>
  );
}

function PreviewForwardBoard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: 620, padding: 20, background: 'transparent' }}>
      {LANDINGS_SAMPLE.map(l => <LandingCardB key={l.id} data={l} />)}
    </div>
  );
}

function ProjectCardBoard() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: 780, padding: 20, background: 'transparent' }}>
      {PROJECTS.slice(0, 4).map(p => <ProjectCard key={p.id} project={p} />)}
    </div>
  );
}

// Artboard wrapper — gives each board a surface with its own bg,
// so the theme reads nicely on the canvas warm-gray grid.
function Artboard({ theme = 'light', children }) {
  const t = TOKENS[theme];
  return (
    <ThemeContext.Provider value={{ t, theme, setTheme: () => {} }}>
      <div style={{
        background: t.bg,
        width: '100%', height: '100%',
        fontFamily: '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontSize: 14,
        color: t.text,
        letterSpacing: '-0.005em',
        WebkitFontSmoothing: 'antialiased',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

function CanvasApp() {
  return (
    <DesignCanvas>
      <DCSection
        id="landing-card"
        title="Landing Card — ключевой объект продукта"
        subtitle="Две композиционные логики. A — плотный досье-стиль для сканирования. B — превью-форвард для визуального разбора."
      >
        <DCArtboard id="dir-a-light" label="A · Dossier — Light" width={560} height={780}>
          <Artboard theme="light"><DossierBoard /></Artboard>
        </DCArtboard>
        <DCArtboard id="dir-a-dark" label="A · Dossier — Dark" width={560} height={780}>
          <Artboard theme="dark"><DossierBoard /></Artboard>
        </DCArtboard>
        <DCArtboard id="dir-b-light" label="B · Preview-forward — Light" width={660} height={780}>
          <Artboard theme="light"><PreviewForwardBoard /></Artboard>
        </DCArtboard>
        <DCArtboard id="dir-b-dark" label="B · Preview-forward — Dark" width={660} height={780}>
          <Artboard theme="dark"><PreviewForwardBoard /></Artboard>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="project-card"
        title="Project Card — системный контекст"
        subtitle="Карточка проекта использует тот же ритм и компоненты. Landing Card живёт внутри проекта."
      >
        <DCArtboard id="pc-light" label="Проекты — Light" width={820} height={680}>
          <Artboard theme="light"><ProjectCardBoard /></Artboard>
        </DCArtboard>
        <DCArtboard id="pc-dark" label="Проекты — Dark" width={820} height={680}>
          <Artboard theme="dark"><ProjectCardBoard /></Artboard>
        </DCArtboard>
      </DCSection>

      <DCSection
        id="decisions"
        title="Решения"
        subtitle="Когда что применять."
      >
        <DCArtboard id="notes" label="Рекомендация" width={640} height={420}>
          <Artboard theme="light">
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c', fontWeight: 500, marginBottom: 8 }}>Для основной сетки</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: '#0c0a09', letterSpacing: '-0.015em', marginBottom: 8 }}>Direction A · Dossier</div>
                <div style={{ fontSize: 13.5, color: '#57534e', lineHeight: 1.55 }}>
                  Маркетолог сканирует 20+ лендингов. Ему нужны цифры, статус, счётчики и кнопка «Опубликовать» — всё на одном экране. Превью работает как напоминание, а не как hero.
                </div>
              </div>
              <div style={{ height: 1, background: '#e7e5e4' }} />
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c', fontWeight: 500, marginBottom: 8 }}>Для витрины / презентации клиенту</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: '#0c0a09', letterSpacing: '-0.015em', marginBottom: 8 }}>Direction B · Preview-forward</div>
                <div style={{ fontSize: 13.5, color: '#57534e', lineHeight: 1.55 }}>
                  Когда важнее «как выглядит», чем «как работает». Используется в разделе «Публичное портфолио» или при скрин-шеринге с клиентом.
                </div>
              </div>
            </div>
          </Artboard>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<CanvasApp />);
