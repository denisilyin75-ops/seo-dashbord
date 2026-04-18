// Minimal smoke test для article-search FTS sanitizer.
// Использует Node 20+ native test runner (node --test).
//
// Запуск: npm test

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ftsSanitize } from '../article-search.js';

describe('ftsSanitize', () => {
  it('returns null for empty/null input', () => {
    assert.equal(ftsSanitize(''), null);
    assert.equal(ftsSanitize(null), null);
    assert.equal(ftsSanitize(undefined), null);
    assert.equal(ftsSanitize('   '), null);
  });

  it('adds prefix wildcard to single word', () => {
    assert.equal(ftsSanitize('кроссовки'), 'кроссовки*');
  });

  it('ANDs multiple words with wildcards', () => {
    const r = ftsSanitize('nike pegasus');
    assert.ok(r.includes('AND'));
    assert.ok(r.includes('nike*'));
    assert.ok(r.includes('pegasus*'));
  });

  it('preserves existing trailing wildcard', () => {
    assert.equal(ftsSanitize('кроссов*'), 'кроссов*');
  });

  it('extracts phrases in quotes', () => {
    const r = ftsSanitize('"exact phrase"');
    assert.ok(r.includes('"exact phrase"'));
  });

  it('strips dangerous FTS5 special characters', () => {
    const r = ftsSanitize('bad:input^();');
    // After sanitization only wildcarded tokens
    assert.ok(!r.includes(':'));
    assert.ok(!r.includes('^'));
    assert.ok(!r.includes('('));
    assert.ok(!r.includes(';'));
  });
});
