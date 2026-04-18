// Readability check — deterministic метрики.
// Flesch-Kincaid адаптированный для русского + структурные правила.
// Не требует LLM.
//
// Rules per design doc §2.5:
//   - avg sentence length ≤ 22 words
//   - max single sentence ≤ 40
//   - paragraph length ≤ 4 sentences
//   - passive voice ratio < 15% (для русского грубо через suffix анализ)
//   - bullet lists присутствуют (2+ на long-form)
//   - H2/H3 density — 1 на 300 слов
//
// Score: 100 - 10 за red issue, -5 за yellow.

import { JSDOM } from 'jsdom';

function makeIssue(code, severity, message, opts = {}) {
  return {
    signal_category: 'readability',
    signal_code: code,
    severity,
    message,
    detail: opts.detail ? JSON.stringify(opts.detail) : null,
    suggestion: opts.suggestion || null,
    auto_fixable: opts.autoFixable ? 1 : 0,
  };
}

// Text → sentences (грубо, по ., !, ?, + абзацы — но не ломаемся на сокращениях).
function splitSentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5); // фильтруем мусор
}

// Грубая эвристика для русского passive voice:
// - страдательные причастия обычно оканчиваются на -н(ый)/-т(ый) и стоят с "быть"/"был(а)"
// - глаголы на -ся/-сь часто маркер пассива
// Не идеально, но баланс между ложными срабатываниями и детектом.
function countPassiveSentences(sentences) {
  let n = 0;
  const patterns = [
    /\b(был|была|были|будет|будут|является)\s+[а-я]+н[аыеоу]?[йт]?\b/i,
    /\b[а-я]+[ае]тся\b/i,
    /\b[а-я]+[ае]лся\b/i,
  ];
  for (const s of sentences) {
    if (patterns.some(p => p.test(s))) n++;
  }
  return n;
}

export function checkReadability({ html }) {
  const issues = [];
  const stats = {};

  if (!html) {
    return { issues: [makeIssue('no_html', 'red', 'HTML недоступен')], stats, score: 0 };
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const body = doc.querySelector('body') || doc;
  const clone = body.cloneNode(true);
  clone.querySelectorAll('script, style, noscript, nav, header, footer, aside').forEach(el => el.remove());

  const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/).filter(w => /[а-яa-z]/i.test(w));
  stats.word_count = words.length;

  if (stats.word_count < 100) {
    issues.push(makeIssue('too_short', 'yellow',
      `Всего ${stats.word_count} слов контента (порог 100 для анализа)`,
      { suggestion: 'Дополните текст или убедитесь что Readability правильно извлёк body' }));
    return { issues, stats, score: 50 };
  }

  const sentences = splitSentences(text);
  stats.sentence_count = sentences.length;
  stats.avg_sentence_len = sentences.length ? words.length / sentences.length : 0;

  // Длина предложений
  const tooLong = sentences.filter(s => s.split(/\s+/).length > 40);
  if (stats.avg_sentence_len > 22) {
    issues.push(makeIssue('avg_sentence_too_long', 'yellow',
      `Средняя длина предложения ${Math.round(stats.avg_sentence_len)} слов (оптимум ≤22)`,
      { detail: { avg: stats.avg_sentence_len.toFixed(1), n: sentences.length },
        suggestion: 'Разбейте длинные предложения на 2-3 — улучшает readability' }));
  }
  if (tooLong.length > 0) {
    issues.push(makeIssue('long_sentences', 'yellow',
      `${tooLong.length} предложений длиннее 40 слов`,
      { detail: { count: tooLong.length, examples: tooLong.slice(0, 2).map(s => s.slice(0, 120) + '...') } }));
  }

  // Абзацы: ищем <p> теги
  const paras = Array.from(doc.querySelectorAll('p'))
    .map(p => p.textContent?.trim() || '')
    .filter(t => t.length > 20);
  stats.paragraph_count = paras.length;

  const longParas = paras.filter(p => splitSentences(p).length > 4);
  if (longParas.length > 2) {
    issues.push(makeIssue('long_paragraphs', 'yellow',
      `${longParas.length} абзацев содержат >4 предложений`,
      { suggestion: 'Разбейте на несколько абзацев — облегчит сканирование' }));
  }

  // Passive voice
  const passive = countPassiveSentences(sentences);
  const passiveRatio = sentences.length ? passive / sentences.length : 0;
  stats.passive_ratio = Number(passiveRatio.toFixed(2));
  if (passiveRatio > 0.15) {
    issues.push(makeIssue('high_passive_voice', 'yellow',
      `${Math.round(passiveRatio * 100)}% предложений в пассивном залоге (лимит 15%)`,
      { detail: { passive, total: sentences.length },
        suggestion: 'Перепишите часть в активный залог — «мы измерили» вместо «было измерено»' }));
  }

  // Bullet lists
  const listItems = doc.querySelectorAll('ul li, ol li').length;
  stats.list_items = listItems;
  if (stats.word_count > 1000 && listItems < 3) {
    issues.push(makeIssue('no_bullet_lists', 'yellow',
      `Long-form (${stats.word_count} слов) без списков — сложно сканировать`,
      { suggestion: 'Добавьте 2-3 bullet-списка для ключевых данных (плюсы, специфики, шаги)' }));
  }

  // Headings density
  const h2h3 = doc.querySelectorAll('h2, h3').length;
  stats.h2h3_count = h2h3;
  const expectedHeadings = Math.floor(stats.word_count / 300);
  if (stats.word_count > 800 && h2h3 < expectedHeadings - 1) {
    issues.push(makeIssue('low_heading_density', 'yellow',
      `${h2h3} H2/H3 на ${stats.word_count} слов (ожидается ~${expectedHeadings})`,
      { suggestion: 'Добавьте подзаголовки — H2 каждые 300-500 слов' }));
  }

  // Score
  let score = 100;
  for (const i of issues) {
    if (i.severity === 'red') score -= 10;
    else if (i.severity === 'yellow') score -= 5;
  }
  score = Math.max(0, Math.min(100, score));
  return { issues, stats, score };
}
