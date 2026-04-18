// Voice check — проверка соответствия text голосу персоны (Дмитрий/Дарья).
// Phase 1: deterministic keyword/regex rules (быстро, бесплатно).
// Phase 2: LLM fallback (Haiku) для нюансов когда deterministic не ловит.
//
// Rules для Дмитрия (popolkam):
//   - Запрещённые: идеально, бомба, вау, 100%, лучший на рынке, никаких недостатков, офигенн
//   - Exclamations: <= 1 на 1000 слов в body
//   - Adjectives inflation: НЕ >3 «отличн/превосходн/шикарн» на 500 слов
//
// Rules для Дарьи (aykakchisto):
//   - Запрещённые: волшебн, идеальная чистота, без остатка (категорично)
//
// Persona определяется по siteBaseUrl:
//   popolkam.ru → dmitri
//   aykakchisto.ru → darya
//   иначе — общий чек (без персона-специфики)

import { JSDOM } from 'jsdom';

function makeIssue(code, severity, message, opts = {}) {
  return {
    signal_category: 'voice',
    signal_code: code,
    severity,
    message,
    detail: opts.detail ? JSON.stringify(opts.detail) : null,
    suggestion: opts.suggestion || null,
    auto_fixable: opts.autoFixable ? 1 : 0,
  };
}

const PERSONAS = {
  dmitri: {
    label: 'Дмитрий Полкин (popolkam)',
    forbidden: [
      { pattern: /\bидеальн[оа-я]*\b/gi, reason: 'Дмитрий не пишет «идеально» — идеальной техники не бывает, он разбирает компромиссы' },
      { pattern: /\bбомб[ау]\b/gi, reason: 'Не в голосе инженера-обозревателя' },
      { pattern: /\bв[оy][уyх]?[уy]?\b|\bпросто\s+огонь\b/gi, reason: 'Дмитрий нейтрален эмоционально' },
      { pattern: /\b100\s*%\b/gi, reason: 'Абсолютные утверждения подрывают доверие к техническому тексту' },
      { pattern: /\bлучш[иеыа-я]+\s+на\s+рынке\b/gi, reason: 'Marketing-превосходство без замеров = красный флаг' },
      { pattern: /\bникаких\s+недостатков\b/gi, reason: 'Недостатки есть всегда — Дмитрий называет их явно' },
      { pattern: /\bофигенн[а-я]*\b/gi, reason: 'Разговорная оценка не в голосе инженера' },
    ],
    adjectives_inflation: /\b(отличн|превосходн|шикарн|великолепн|прекрасн)[а-я]*\b/gi,
  },
  darya: {
    label: 'Дарья Метёлкина (aykakchisto)',
    forbidden: [
      { pattern: /\bволшебн[а-я]*\b/gi, reason: 'Дарья — химик, не верит в «волшебное средство»' },
      { pattern: /\bидеальн[а-я]*\s+чистот[а-я]+\b/gi, reason: 'Идеальной чистоты не бывает — это Дарья знает' },
      { pattern: /\bстопроцентн[а-я]*\b/gi, reason: 'Абсолютные претензии в химии подозрительны' },
    ],
    adjectives_inflation: null,
  },
};

function detectPersona(siteBaseUrl) {
  if (!siteBaseUrl) return null;
  const host = siteBaseUrl.toLowerCase();
  if (host.includes('popolkam')) return 'dmitri';
  if (host.includes('aykakchisto')) return 'darya';
  return null;
}

export function checkVoice({ html, siteBaseUrl }) {
  const issues = [];
  const stats = {};

  if (!html) {
    return { issues: [makeIssue('no_html', 'red', 'HTML недоступен')], stats, score: 0 };
  }

  const personaKey = detectPersona(siteBaseUrl);
  const persona = personaKey ? PERSONAS[personaKey] : null;
  stats.persona = personaKey;

  if (!persona) {
    // Без персоны делаем только generic checks (excessive exclamations)
    return runGenericChecks(html);
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const body = doc.querySelector('body') || doc;
  const clone = body.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, nav, header, footer, aside').forEach(el => el.remove());
  const text = clone.textContent || '';
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  stats.word_count = wordCount;
  stats.forbidden_hits = [];

  // Forbidden words
  for (const rule of persona.forbidden) {
    const matches = text.match(rule.pattern) || [];
    if (matches.length) {
      stats.forbidden_hits.push({ pattern: String(rule.pattern), count: matches.length, examples: [...new Set(matches)].slice(0, 5) });
      issues.push(makeIssue('forbidden_phrase', 'red',
        `Запрещённые слова для ${persona.label}: "${[...new Set(matches)].slice(0, 3).join('", "')}" (${matches.length} раз)`,
        { detail: { pattern: String(rule.pattern), count: matches.length, examples: [...new Set(matches)].slice(0, 5) },
          suggestion: rule.reason }));
    }
  }

  // Exclamations
  const exclamations = (text.match(/!/g) || []).length;
  const exclamationsPer1000 = wordCount > 0 ? (exclamations / wordCount) * 1000 : 0;
  stats.exclamations = exclamations;
  if (exclamationsPer1000 > 1) {
    issues.push(makeIssue('excessive_exclamations', 'yellow',
      `${exclamations} восклицаний на ${wordCount} слов (лимит 1/1000)`,
      { detail: { total: exclamations, per_1000: exclamationsPer1000.toFixed(1) },
        suggestion: 'Инженерный voice нейтральный. Замените ! на . в большинстве случаев.' }));
  }

  // Adjectives inflation
  if (persona.adjectives_inflation) {
    const adjMatches = text.match(persona.adjectives_inflation) || [];
    const adjPer500 = wordCount > 0 ? (adjMatches.length / wordCount) * 500 : 0;
    stats.adjectives_count = adjMatches.length;
    if (adjPer500 > 3) {
      issues.push(makeIssue('adjectives_inflation', 'yellow',
        `${adjMatches.length} усиливающих прилагательных на ${wordCount} слов (лимит ~3/500)`,
        { detail: { count: adjMatches.length, per_500: adjPer500.toFixed(1) },
          suggestion: 'Замените «отличный» на конкретные замеры: "варит 7 °C за 30 сек" вместо "отличный бойлер"' }));
    }
  }

  // Lead paragraph check: первый <p> в body не должен начинаться с "!" или быть CTA
  const firstP = doc.querySelector('article p, main p, .content p, body p');
  if (firstP) {
    const leadText = firstP.textContent?.trim() || '';
    if (/^[\s\S]{0,100}(купить|получить|купи|скидка|жми|кликай)/i.test(leadText)) {
      issues.push(makeIssue('lead_is_cta', 'yellow',
        'Lead абзац начинается как CTA (marketing-призыв)',
        { detail: { lead: leadText.slice(0, 200) },
          suggestion: 'Lead для Дмитрия = конкретика (техника на X лет, замеры) а не призыв купить' }));
    }
    if (/^!+/.test(leadText.trim())) {
      issues.push(makeIssue('lead_starts_with_exclamation', 'yellow',
        'Lead начинается с восклицания — выбивается из voice'));
    }
  }

  // Score
  let score = 100;
  for (const i of issues) {
    if (i.severity === 'red') score -= 15;
    else if (i.severity === 'yellow') score -= 5;
  }
  score = Math.max(0, Math.min(100, score));
  return { issues, stats, score };
}

function runGenericChecks(html) {
  const issues = [];
  const dom = new JSDOM(html);
  const text = dom.window.document.body?.textContent || '';
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const stats = { persona: null, word_count: wordCount };
  const exclamations = (text.match(/!/g) || []).length;
  stats.exclamations = exclamations;
  if (wordCount > 500 && exclamations / wordCount * 1000 > 3) {
    issues.push(makeIssue('excessive_exclamations', 'yellow',
      `${exclamations} восклицаний на ${wordCount} слов — заметно избыточно`));
  }

  let score = issues.length ? 85 : 100;
  return { issues, stats, score };
}
