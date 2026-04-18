/**
 * Phase A гамификации — предсказанный «вклад действия в капитализацию».
 *
 * ВАЖНО: цифры реальные и заниженные. Это не «motivational», а грубая
 * оценка того, что добавит наш Site Valuation формула при следующем перерасчёте.
 *   - publish review:    +$15  (= PER_ARTICLE_VALUE.review в site-valuation.js)
 *   - publish comparison:+$25
 *   - publish guide:     +$10
 *   - update / draft:    +$2-3 (микро-движения, которые накопительно растят)
 *
 * Phase B даст пользовательский конфиг через user_prefs `gamification.impact_overrides`.
 */

const PUBLISH_IMPACT_BY_TYPE = {
  review: 15,
  comparison: 25,
  guide: 10,
  quiz: 30,
  tool: 40,
  category: 20,
};
const PUBLISH_DEFAULT = 10;

const CREATE_DRAFT_IMPACT = 3;       // создали planned/draft — мелочь, но в плюс
const UPDATE_DRAFT_IMPACT = 2;       // правка не-публикованной статьи
const UPDATE_PUBLISHED_IMPACT = 5;   // правка опубликованной = freshness boost

export function impactForCreate(article) {
  if (article?.status === 'published') {
    return PUBLISH_IMPACT_BY_TYPE[article?.type] || PUBLISH_DEFAULT;
  }
  return CREATE_DRAFT_IMPACT;
}

export function impactForUpdate(article) {
  if (article?.status === 'published') return UPDATE_PUBLISHED_IMPACT;
  return UPDATE_DRAFT_IMPACT;
}

/**
 * Хелпер для форматирования суффикса toast'а:
 *   buildToastSuffix(15)  → ' · 💎 +$15'
 *   buildToastSuffix(0)   → ''
 */
export function buildToastSuffix(impact, enabled) {
  if (!enabled || !impact) return '';
  return ` · 💎 +$${impact}`;
}
