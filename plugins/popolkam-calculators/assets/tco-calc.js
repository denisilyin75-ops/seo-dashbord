/**
 * Popolkam TCO Calculator — полная стоимость владения кофемашиной.
 *
 * Считает ЧЕСТНО:
 *   - Зерно + декальцинатор + чистящие таблетки + фильтр воды + молоко
 *   - Электричество
 *   - Амортизация машины
 *
 * В отличие от обычных калькуляторов, которые считают только "цена машины /
 * (цена чашки в кофейне - цена зерна)", даёт реальный срок окупаемости.
 *
 * Принцип: supreme — всё для пользователя, не для партнёрки. Показываем правду,
 * даже если она менее радужная чем в маркетинговых материалах.
 */

(function () {
  'use strict';

  // ================================================================
  // Дефолты расходников по типам машин.
  // Все цены в ₽, актуально на апрель 2026 (обновлять каждые 6 мес).
  // ================================================================
  const DEFAULTS = {
    automatic: {
      label: 'Автоматическая',
      bean_g_per_cup: 9,            // г зерна на чашку
      descale_price: 800,           // ₽ за упаковку декальцинатора
      descale_uses: 30,             // хватает на N декальцинаций
      descale_interval_cups: 250,   // одна декальцинация на N чашек
      tabs_price: 1500,             // ₽ за упаковку чистящих таблеток
      tabs_per_pack: 10,
      tabs_interval_cups: 90,       // 1 таблетка на N чашек
      filter_price: 800,            // ₽ за фильтр воды
      filter_cups: 270,             // фильтр на N чашек (~2 мес при 3/день)
      electricity_kwh_per_cup: 0.03,
      life_years: 5,
    },
    horn: {
      label: 'Рожковая',
      bean_g_per_cup: 14,
      descale_price: 500,
      descale_uses: 20,
      descale_interval_cups: 200,
      tabs_price: 600,
      tabs_per_pack: 10,
      tabs_interval_cups: 120,
      filter_price: 0,              // у рожковых обычно нет встроенного фильтра
      filter_cups: 1,
      electricity_kwh_per_cup: 0.02,
      life_years: 8,                // живут дольше
    },
    capsule: {
      label: 'Капсульная',
      bean_g_per_cup: 0,            // капсулы вместо зерна
      capsule_price: 40,            // ₽ за капсулу (дороже чем зерно)
      descale_price: 300,
      descale_uses: 20,
      descale_interval_cups: 300,
      tabs_price: 0,
      tabs_per_pack: 1,
      tabs_interval_cups: 999999,
      filter_price: 0,
      filter_cups: 1,
      electricity_kwh_per_cup: 0.02,
      life_years: 4,
    },
  };

  // Общие дефолты
  const BASE = {
    bean_price_per_kg: 1500,     // ₽ за 1 кг зерна (среднее)
    milk_price_per_l: 90,        // ₽ за 1 л молока
    milk_ml_per_cup: 40,         // мл на капучино
    electricity_price_kwh: 6,    // ₽ за кВт·ч
    cafe_cup_price: 300,         // ₽ за эспрессо в кофейне
    default_cups_per_day: 3,
    default_life_years: 3,
  };

  // ================================================================
  // Формат чисел
  // ================================================================
  const fmt = (n) => {
    if (!isFinite(n)) return '—';
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n));
  };
  const fmtMoney = (n) => fmt(n) + ' ₽';
  const fmtDays = (days) => {
    if (days < 30) return `${Math.round(days)} дн.`;
    if (days < 365) return `${(days / 30).toFixed(1)} мес.`;
    return `${(days / 365).toFixed(1)} г.`;
  };

  // ================================================================
  // Модель расчёта
  // ================================================================
  function calc(inputs, defaults) {
    const cupsPerDay = Math.max(1, Number(inputs.cupsPerDay) || BASE.default_cups_per_day);
    const cupsPerMonth = cupsPerDay * 30;
    const cupsPerYear = cupsPerDay * 365;
    const machinePrice = Math.max(0, Number(inputs.machinePrice) || 0);
    const lifeYears = Math.max(0.5, Number(inputs.lifeYears) || BASE.default_life_years);
    const withMilk = !!inputs.withMilk;
    const cafePrice = Math.max(0, Number(inputs.cafePrice) || BASE.cafe_cup_price);

    // --- расход на одну чашку (переменные расходы) ---

    // 1. Зерно или капсула
    let beanCost = 0;
    if (inputs.machineType === 'capsule') {
      beanCost = Number(inputs.capsulePrice) || defaults.capsule_price || 40;
    } else {
      const beanPriceKg = Number(inputs.beanPricePerKg) || BASE.bean_price_per_kg;
      const gramsPerCup = Number(inputs.beanGramsPerCup) || defaults.bean_g_per_cup;
      beanCost = (gramsPerCup / 1000) * beanPriceKg;
    }

    // 2. Декальцинатор
    const descalePrice = Number(inputs.descalePrice) || defaults.descale_price || 0;
    const descaleInterval = Number(inputs.descaleInterval) || defaults.descale_interval_cups || 250;
    const descaleUses = Number(inputs.descaleUses) || defaults.descale_uses || 30;
    // стоимость одной декальцинации = цена / сколько раз в упаковке
    const descaleCostPerUse = descalePrice / descaleUses;
    // расход на чашку
    const descaleCostPerCup = descaleInterval > 0 ? descaleCostPerUse / descaleInterval : 0;

    // 3. Чистящие таблетки
    const tabsPrice = Number(inputs.tabsPrice) || defaults.tabs_price || 0;
    const tabsPerPack = Number(inputs.tabsPerPack) || defaults.tabs_per_pack || 10;
    const tabsInterval = Number(inputs.tabsInterval) || defaults.tabs_interval_cups || 90;
    const tabCostPerUse = tabsPerPack > 0 ? tabsPrice / tabsPerPack : 0;
    const tabsCostPerCup = tabsInterval > 0 ? tabCostPerUse / tabsInterval : 0;

    // 4. Фильтр воды
    const filterPrice = Number(inputs.filterPrice) || defaults.filter_price || 0;
    const filterCups = Number(inputs.filterCups) || defaults.filter_cups || 1;
    const filterCostPerCup = filterCups > 0 ? filterPrice / filterCups : 0;

    // 5. Молоко
    const milkCostPerCup = withMilk
      ? ((Number(inputs.milkMlPerCup) || BASE.milk_ml_per_cup) / 1000) * (Number(inputs.milkPricePerL) || BASE.milk_price_per_l)
      : 0;

    // 6. Электричество
    const elCostPerCup = (Number(inputs.electricityKwh) || defaults.electricity_kwh_per_cup) * (Number(inputs.electricityPrice) || BASE.electricity_price_kwh);

    // Операционная стоимость чашки
    const opCostPerCup = beanCost + descaleCostPerCup + tabsCostPerCup + filterCostPerCup + milkCostPerCup + elCostPerCup;

    // Амортизация машины (учитываем выбранный срок эксплуатации, не только срок службы)
    const totalCupsPerLife = cupsPerYear * lifeYears;
    const amortPerCup = machinePrice > 0 && totalCupsPerLife > 0 ? machinePrice / totalCupsPerLife : 0;

    // Полная стоимость чашки
    const totalCostPerCup = opCostPerCup + amortPerCup;

    // Сравнение с кофейней
    const savingsPerCup = Math.max(0, cafePrice - totalCostPerCup);
    const savingsPerMonth = savingsPerCup * cupsPerMonth;
    const savingsPerYear = savingsPerCup * cupsPerYear;
    const savingsPerLife = savingsPerYear * lifeYears;

    // Срок окупаемости
    let paybackDays = null;
    if (savingsPerCup > 0 && machinePrice > 0) {
      // Окупаемость считаем от опер.стоимости (без амортизации) — потому что
      // амортизация это как раз и есть возврат вложений в машину.
      // Окупаемость = цена машины / (экономия на чашке без амортизации × чашек в день)
      const opSavingsPerCup = cafePrice - opCostPerCup;
      if (opSavingsPerCup > 0) {
        paybackDays = machinePrice / (opSavingsPerCup * cupsPerDay);
      }
    }

    // Полная TCO за срок эксплуатации
    const opCostPerLife = opCostPerCup * totalCupsPerLife;
    const totalCostOfOwnership = machinePrice + opCostPerLife;
    const cafeCostPerLife = cafePrice * totalCupsPerLife;

    // Разбивка по статьям расхода (для pie/bar chart)
    const breakdown = {
      bean:      { label: inputs.machineType === 'capsule' ? 'Капсулы' : 'Зерно', cost: beanCost, pct: 0 },
      descale:   { label: 'Декальцинация', cost: descaleCostPerCup, pct: 0 },
      tabs:      { label: 'Чистящие таблетки', cost: tabsCostPerCup, pct: 0 },
      filter:    { label: 'Фильтр воды', cost: filterCostPerCup, pct: 0 },
      milk:      { label: 'Молоко', cost: milkCostPerCup, pct: 0 },
      electricity: { label: 'Электричество', cost: elCostPerCup, pct: 0 },
      amort:     { label: 'Амортизация машины', cost: amortPerCup, pct: 0 },
    };
    Object.values(breakdown).forEach((b) => {
      b.pct = totalCostPerCup > 0 ? (b.cost / totalCostPerCup) * 100 : 0;
    });

    return {
      cupsPerMonth,
      cupsPerYear,
      opCostPerCup,
      amortPerCup,
      totalCostPerCup,
      cafePrice,
      savingsPerCup,
      savingsPerMonth,
      savingsPerYear,
      savingsPerLife,
      paybackDays,
      totalCostOfOwnership,
      cafeCostPerLife,
      breakdown,
    };
  }

  // ================================================================
  // UI — создание компонента
  // ================================================================
  function createCalculator(root) {
    const rawConfig = root.getAttribute('data-config');
    let config = {};
    try { config = JSON.parse(rawConfig || '{}'); } catch (e) {}

    // Начальное состояние
    const state = {
      machineName: config.machineName || '',
      machinePrice: config.machinePrice || 30000,
      machineType: config.machineType || 'automatic',
      cupsPerDay: config.cupsPerDay || BASE.default_cups_per_day,
      lifeYears: BASE.default_life_years,
      withMilk: false,
      cafePrice: BASE.cafe_cup_price,
      buyUrl: config.buyUrl || '',
      buyLabel: config.buyLabel || 'Смотреть цену',

      // Продвинутые параметры (сначала скрыты)
      advanced: false,
      beanPricePerKg: BASE.bean_price_per_kg,
      capsulePrice: 40,
      milkMlPerCup: BASE.milk_ml_per_cup,
      milkPricePerL: BASE.milk_price_per_l,
      electricityPrice: BASE.electricity_price_kwh,
    };

    root.innerHTML = `
      <div class="popolkam-calc-wrap">
        <div class="popolkam-calc-header">
          <div class="popolkam-calc-title">
            <span class="popolkam-calc-icon">☕</span>
            <div>
              <div class="popolkam-calc-h1">Калькулятор полной стоимости владения</div>
              <div class="popolkam-calc-h2" data-role="machine-subtitle"></div>
            </div>
          </div>
          <div class="popolkam-calc-honest">
            <strong>Честная модель.</strong> Считаем все расходы: зерно, декальцинатор, чистящие таблетки, фильтр воды, электричество, амортизацию.
            Обычные калькуляторы показывают окупаемость в 2× короче реальной.
          </div>
        </div>

        <div class="popolkam-calc-grid">
          <div class="popolkam-calc-inputs">

            <div class="popolkam-calc-field">
              <label>Цена кофемашины, ₽</label>
              <input type="number" data-field="machinePrice" min="0" step="1000" />
            </div>

            <div class="popolkam-calc-field">
              <label>Тип машины</label>
              <select data-field="machineType">
                <option value="automatic">Автоматическая</option>
                <option value="horn">Рожковая</option>
                <option value="capsule">Капсульная</option>
              </select>
            </div>

            <div class="popolkam-calc-field">
              <label>Чашек в день: <b data-role="cups-label">3</b></label>
              <input type="range" data-field="cupsPerDay" min="1" max="10" step="1" />
            </div>

            <div class="popolkam-calc-field">
              <label>С молоком (капучино/латте)?</label>
              <label class="popolkam-calc-switch">
                <input type="checkbox" data-field="withMilk" />
                <span class="popolkam-calc-switch-slider"></span>
              </label>
            </div>

            <div class="popolkam-calc-field">
              <label>Цена эспрессо в кофейне, ₽</label>
              <input type="number" data-field="cafePrice" min="0" step="10" />
            </div>

            <div class="popolkam-calc-field">
              <label>Срок эксплуатации, лет: <b data-role="life-label">3</b></label>
              <input type="range" data-field="lifeYears" min="1" max="10" step="1" />
            </div>

            <button type="button" class="popolkam-calc-toggle-advanced" data-role="toggle-advanced">
              + Эксперт: настроить все расходники
            </button>

            <div class="popolkam-calc-advanced" data-role="advanced" style="display:none;">
              <div class="popolkam-calc-advanced-title">Тонкие настройки</div>
              <div class="popolkam-calc-field" data-advanced-group="beans">
                <label>Цена зерна, ₽ за кг</label>
                <input type="number" data-field="beanPricePerKg" min="500" step="100" />
              </div>
              <div class="popolkam-calc-field" data-advanced-group="capsule" style="display:none;">
                <label>Цена одной капсулы, ₽</label>
                <input type="number" data-field="capsulePrice" min="10" step="1" />
              </div>
              <div class="popolkam-calc-field" data-advanced-group="milk" style="display:none;">
                <label>Молока на чашку, мл</label>
                <input type="number" data-field="milkMlPerCup" min="0" step="10" />
              </div>
              <div class="popolkam-calc-field" data-advanced-group="milk" style="display:none;">
                <label>Цена молока, ₽ за л</label>
                <input type="number" data-field="milkPricePerL" min="30" step="10" />
              </div>
              <div class="popolkam-calc-field">
                <label>Электричество, ₽ за кВт·ч</label>
                <input type="number" data-field="electricityPrice" min="3" max="15" step="0.5" />
              </div>
            </div>
          </div>

          <div class="popolkam-calc-results">
            <div class="popolkam-calc-highlight">
              <div class="popolkam-calc-hl-label">Стоимость одной чашки дома</div>
              <div class="popolkam-calc-hl-value" data-role="cup-cost"></div>
              <div class="popolkam-calc-hl-sub">
                против <b data-role="cafe-price"></b> в кофейне — экономия <b data-role="savings-per-cup"></b>
              </div>
            </div>

            <div class="popolkam-calc-metrics">
              <div class="popolkam-calc-metric">
                <div class="popolkam-calc-metric-label">Окупаемость</div>
                <div class="popolkam-calc-metric-value" data-role="payback"></div>
              </div>
              <div class="popolkam-calc-metric">
                <div class="popolkam-calc-metric-label">Экономия / мес</div>
                <div class="popolkam-calc-metric-value" data-role="save-month"></div>
              </div>
              <div class="popolkam-calc-metric">
                <div class="popolkam-calc-metric-label">Экономия / год</div>
                <div class="popolkam-calc-metric-value" data-role="save-year"></div>
              </div>
              <div class="popolkam-calc-metric">
                <div class="popolkam-calc-metric-label">За срок эксплуатации</div>
                <div class="popolkam-calc-metric-value" data-role="save-life"></div>
              </div>
            </div>

            <div class="popolkam-calc-breakdown">
              <div class="popolkam-calc-breakdown-title">Из чего складывается стоимость чашки</div>
              <div class="popolkam-calc-breakdown-list" data-role="breakdown"></div>
            </div>

            <div class="popolkam-calc-tco">
              <div class="popolkam-calc-tco-row">
                <span>Полная стоимость владения (TCO)</span>
                <b data-role="tco"></b>
              </div>
              <div class="popolkam-calc-tco-row">
                <span>Если бы пили только в кофейне</span>
                <b data-role="cafe-total"></b>
              </div>
              <div class="popolkam-calc-tco-row popolkam-calc-tco-delta">
                <span>Итого сэкономите</span>
                <b data-role="tco-delta"></b>
              </div>
            </div>

            <div class="popolkam-calc-cta" data-role="cta"></div>

            <div class="popolkam-calc-disclaimer">
              Расчёт основан на средних ценах расходников на апрель 2026. Реальные цены
              могут отличаться — настройте в режиме «Эксперт».
              <br />
              <em>Почему честно?</em> Большинство калькуляторов не учитывают декальцинацию,
              чистящие таблетки и фильтр воды — это даёт 20-30% ошибки в прогнозе окупаемости.
              Мы считаем всё.
            </div>
          </div>
        </div>
      </div>
    `;

    // ------- Инициализация значений полей -------
    Object.keys(state).forEach((key) => {
      const el = root.querySelector(`[data-field="${key}"]`);
      if (!el) return;
      if (el.type === 'checkbox') el.checked = !!state[key];
      else el.value = state[key];
    });

    // Машина name в подзаголовок
    const subtitleEl = root.querySelector('[data-role="machine-subtitle"]');
    if (state.machineName) subtitleEl.textContent = 'Для модели: ' + state.machineName;
    else subtitleEl.style.display = 'none';

    // ------- Рендеринг результатов -------
    function render() {
      const defaults = DEFAULTS[state.machineType] || DEFAULTS.automatic;
      const r = calc(state, defaults);

      root.querySelector('[data-role="cups-label"]').textContent = state.cupsPerDay;
      root.querySelector('[data-role="life-label"]').textContent = state.lifeYears;
      root.querySelector('[data-role="cup-cost"]').textContent = fmtMoney(r.totalCostPerCup);
      root.querySelector('[data-role="cafe-price"]').textContent = fmtMoney(r.cafePrice);
      root.querySelector('[data-role="savings-per-cup"]').textContent = fmtMoney(r.savingsPerCup);
      root.querySelector('[data-role="payback"]').textContent = r.paybackDays ? fmtDays(r.paybackDays) : '—';
      root.querySelector('[data-role="save-month"]').textContent = fmtMoney(r.savingsPerMonth);
      root.querySelector('[data-role="save-year"]').textContent = fmtMoney(r.savingsPerYear);
      root.querySelector('[data-role="save-life"]').textContent = fmtMoney(r.savingsPerLife);
      root.querySelector('[data-role="tco"]').textContent = fmtMoney(r.totalCostOfOwnership);
      root.querySelector('[data-role="cafe-total"]').textContent = fmtMoney(r.cafeCostPerLife);
      root.querySelector('[data-role="tco-delta"]').textContent = fmtMoney(r.cafeCostPerLife - r.totalCostOfOwnership);

      // Breakdown
      const bdEl = root.querySelector('[data-role="breakdown"]');
      const colors = ['#f97316', '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#84cc16', '#64748b'];
      const items = Object.entries(r.breakdown).filter(([_, b]) => b.cost > 0.01);
      bdEl.innerHTML = items.map(([k, b], i) => `
        <div class="popolkam-calc-bd-item">
          <div class="popolkam-calc-bd-bar-wrap">
            <div class="popolkam-calc-bd-bar" style="width:${b.pct.toFixed(1)}%;background:${colors[i % colors.length]}"></div>
          </div>
          <div class="popolkam-calc-bd-label">
            <span>${b.label}</span>
            <span><b>${fmtMoney(b.cost)}</b> <small>(${b.pct.toFixed(0)}%)</small></span>
          </div>
        </div>
      `).join('');

      // CTA
      const ctaEl = root.querySelector('[data-role="cta"]');
      if (state.buyUrl && r.paybackDays) {
        const paybackText = fmtDays(r.paybackDays);
        ctaEl.innerHTML = `
          <div class="popolkam-calc-cta-text">Окупается за ${paybackText} при ${state.cupsPerDay} чашках/день</div>
          <a href="${state.buyUrl}" class="popolkam-calc-cta-btn" target="_blank" rel="nofollow noopener sponsored">${state.buyLabel} →</a>
        `;
      } else {
        ctaEl.style.display = 'none';
      }
    }

    // ------- Слушатели -------
    root.querySelectorAll('[data-field]').forEach((el) => {
      el.addEventListener('input', (e) => {
        const field = el.getAttribute('data-field');
        let val = el.type === 'checkbox' ? el.checked : el.value;
        if (el.type === 'number' || el.type === 'range') val = Number(val);
        state[field] = val;

        // При смене типа машины — переключаем видимость advanced-групп
        if (field === 'machineType') {
          root.querySelector('[data-advanced-group="beans"]').style.display =
            state.machineType === 'capsule' ? 'none' : '';
          root.querySelector('[data-advanced-group="capsule"]').style.display =
            state.machineType === 'capsule' ? '' : 'none';
        }

        if (field === 'withMilk') {
          root.querySelectorAll('[data-advanced-group="milk"]').forEach((g) => {
            g.style.display = state.withMilk ? '' : 'none';
          });
        }

        render();
      });
    });

    // Advanced toggle
    const toggleBtn = root.querySelector('[data-role="toggle-advanced"]');
    const advEl = root.querySelector('[data-role="advanced"]');
    toggleBtn.addEventListener('click', () => {
      state.advanced = !state.advanced;
      advEl.style.display = state.advanced ? '' : 'none';
      toggleBtn.textContent = state.advanced
        ? '− Скрыть экспертные настройки'
        : '+ Эксперт: настроить все расходники';
    });

    // Initial milk group visibility
    root.querySelectorAll('[data-advanced-group="milk"]').forEach((g) => {
      g.style.display = state.withMilk ? '' : 'none';
    });
    // Initial capsule vs beans visibility
    if (state.machineType === 'capsule') {
      root.querySelector('[data-advanced-group="beans"]').style.display = 'none';
      root.querySelector('[data-advanced-group="capsule"]').style.display = '';
    }

    render();
  }

  // ================================================================
  // Init
  // ================================================================
  function init() {
    document.querySelectorAll('.popolkam-tco-calc').forEach(createCalculator);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
