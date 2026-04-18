// AI Pricing — central table цен моделей для точного cost tracking.
//
// Источник: OpenRouter pricing (https://openrouter.ai/models) + Anthropic console.
// Цены per 1M tokens. Обновлять при изменении прайса (раз в квартал).
// Последнее обновление: 2026-04-18.
//
// Public: priceFor(model) → { in, out, currency } где in/out = $ per 1M tokens.
// computeCost({ tokensIn, tokensOut, model }) → USD.

const PRICES_PER_1M_TOKENS = {
  // Anthropic — прямой API + OpenRouter (идентичный pass-through)
  'claude-opus-4-20250514':       { in: 15.00, out: 75.00 },
  'claude-opus-4':                { in: 15.00, out: 75.00 },
  'claude-sonnet-4-20250514':     { in:  3.00, out: 15.00 },
  'claude-sonnet-4':              { in:  3.00, out: 15.00 },
  'claude-sonnet-4-6':            { in:  3.00, out: 15.00 },
  'claude-haiku-4-5-20251001':    { in:  0.25, out:  1.25 },
  'claude-haiku-4-5':             { in:  0.25, out:  1.25 },
  'claude-3.5-haiku':             { in:  0.80, out:  4.00 },
  'claude-3-haiku':               { in:  0.25, out:  1.25 },

  // OpenRouter prefixed (anthropic/...)
  'anthropic/claude-opus-4-7':    { in: 15.00, out: 75.00 },
  'anthropic/claude-opus-4':      { in: 15.00, out: 75.00 },
  'anthropic/claude-sonnet-4.6':  { in:  3.00, out: 15.00 },
  'anthropic/claude-sonnet-4.5':  { in:  3.00, out: 15.00 },
  'anthropic/claude-sonnet-4':    { in:  3.00, out: 15.00 },
  'anthropic/claude-3.7-sonnet':  { in:  3.00, out: 15.00 },
  'anthropic/claude-haiku-4.5':   { in:  0.25, out:  1.25 },
  'anthropic/claude-3.5-haiku':   { in:  0.80, out:  4.00 },
  'anthropic/claude-3-haiku':     { in:  0.25, out:  1.25 },

  // OpenAI на OpenRouter
  'openai/gpt-4o':                { in:  2.50, out: 10.00 },
  'openai/gpt-4o-mini':           { in:  0.15, out:  0.60 },

  // Local LLM — electricity only, условно
  'qwen2.5:72b':                  { in:  0.00, out:  0.00, note: 'local' },
  'llama3.1:70b':                 { in:  0.00, out:  0.00, note: 'local' },
  'llama3.1:8b':                  { in:  0.00, out:  0.00, note: 'local' },
};

const FALLBACK = { in: 3.00, out: 15.00, note: 'unknown-model-using-sonnet-baseline' };

/**
 * Получить цену модели. Возвращает FALLBACK (Sonnet baseline) если модель не в table.
 * @param {string} model
 * @returns {{ in: number, out: number, note?: string }} per 1M tokens
 */
export function priceFor(model) {
  if (!model) return FALLBACK;
  return PRICES_PER_1M_TOKENS[model] || FALLBACK;
}

/**
 * Точный cost в USD.
 * @param {object} opts
 * @param {number} [opts.tokensIn=0] — prompt tokens
 * @param {number} [opts.tokensOut=0] — completion tokens
 * @param {string} opts.model
 * @returns {number} USD (e.g. 0.00234)
 */
export function computeCost({ tokensIn = 0, tokensOut = 0, model }) {
  const price = priceFor(model);
  return (tokensIn / 1_000_000) * price.in + (tokensOut / 1_000_000) * price.out;
}

/**
 * Для aggregations: возвращает все известные модели с prices.
 */
export function allPrices() {
  return Object.entries(PRICES_PER_1M_TOKENS).map(([model, p]) => ({ model, ...p }));
}
