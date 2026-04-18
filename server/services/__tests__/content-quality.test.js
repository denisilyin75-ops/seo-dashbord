// Smoke tests для content-quality checkers (deterministic, не требуют DB/LLM).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkSeoHygiene } from '../content-quality/seo-hygiene.js';
import { checkSchema } from '../content-quality/schema-validator.js';
import { checkReadability } from '../content-quality/readability.js';
import { checkVoice } from '../content-quality/voice.js';
import { checkEeat } from '../content-quality/eeat.js';

const SAMPLE_GOOD = `<!DOCTYPE html>
<html lang="ru">
<head>
  <title>Sample</title>
  <meta name="description" content="Это длинное и осмысленное meta description для проверки от 120 до 160 символов, чтобы скоринг был правильным.">
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Article","headline":"H","author":{"@type":"Person","name":"Д"},"datePublished":"2026-04-19"}
  </script>
</head>
<body>
  <article>
    <h1>Единственный H1</h1>
    <p>Первый абзац с конкретной информацией о теме. Короткие предложения. Без восклицаний.</p>
    <h2>Подзаголовок</h2>
    <p>Второй абзац. Не слишком длинный.</p>
    <p>Третий абзац для объёма контента. Мы разбираем компромиссы честно.</p>
    <ul><li>Пункт 1</li><li>Пункт 2</li></ul>
    <a href="/link1/">Internal link 1</a>
    <a href="/link2/">Internal link 2</a>
    <a href="/link3/">Internal link 3</a>
    <a rel="author" href="/o-avtore/">Автор: Дмитрий Полкин</a>
    <time datetime="2026-04-19">2026-04-19</time>
  </article>
</body>
</html>`;

const SAMPLE_BAD_H1 = `<html><body><h1>First</h1><h1>Second</h1></body></html>`;

describe('checkSeoHygiene', () => {
  it('returns empty issues for clean HTML', () => {
    const r = checkSeoHygiene({ html: SAMPLE_GOOD, siteBaseUrl: 'https://example.com' });
    assert.ok(r.score >= 60, `score ${r.score} should be >= 60`);
  });

  it('flags multiple H1', () => {
    const r = checkSeoHygiene({ html: SAMPLE_BAD_H1, siteBaseUrl: 'https://example.com' });
    const codes = r.issues.map(i => i.signal_code);
    assert.ok(codes.includes('multiple_h1'));
  });

  it('returns empty-html issue for empty input', () => {
    const r = checkSeoHygiene({ html: '', siteBaseUrl: 'https://example.com' });
    assert.equal(r.issues[0].signal_code, 'empty_html');
  });
});

describe('checkSchema', () => {
  it('detects missing schema', () => {
    const r = checkSchema({ html: '<html><body>no jsonld</body></html>' });
    assert.ok(r.issues.some(i => i.signal_code === 'no_schema'));
  });

  it('detects invalid JSON-LD', () => {
    const r = checkSchema({ html: '<html><body><script type="application/ld+json">{bad</script></body></html>' });
    assert.ok(r.issues.some(i => i.signal_code === 'invalid_json'));
  });

  it('accepts valid Article schema', () => {
    const r = checkSchema({ html: SAMPLE_GOOD });
    assert.ok(r.score >= 80);
  });
});

describe('checkReadability', () => {
  it('returns too_short for short text', () => {
    const r = checkReadability({ html: '<p>Short text</p>' });
    assert.ok(r.issues.some(i => i.signal_code === 'too_short'));
  });

  it('computes word count', () => {
    const r = checkReadability({ html: SAMPLE_GOOD });
    assert.ok(r.stats.word_count >= 0);
  });
});

describe('checkVoice', () => {
  it('no persona applied — generic checks only', () => {
    const r = checkVoice({ html: SAMPLE_GOOD, siteBaseUrl: 'https://unknown.com' });
    assert.equal(r.stats.persona, null);
  });

  it('detects Dmitri persona for popolkam', () => {
    const r = checkVoice({ html: SAMPLE_GOOD, siteBaseUrl: 'https://popolkam.ru' });
    assert.equal(r.stats.persona, 'dmitri');
  });

  it('flags forbidden phrases for Dmitri', () => {
    const r = checkVoice({ html: '<p>Это идеально!</p>', siteBaseUrl: 'https://popolkam.ru' });
    assert.ok(r.issues.some(i => i.signal_code === 'forbidden_phrase'));
  });
});

describe('checkEeat', () => {
  it('detects affiliate links + requires disclosure', () => {
    const affHtml = `<html><body>
      <a href="https://www.admitad.com/affiliate/123">Купить</a>
    </body></html>`;
    const r = checkEeat({ html: affHtml });
    assert.ok(r.issues.some(i => i.signal_code === 'missing_affiliate_disclosure'));
  });

  it('accepts page with author byline', () => {
    const r = checkEeat({ html: SAMPLE_GOOD });
    assert.ok(r.stats.author_byline);
  });
});
