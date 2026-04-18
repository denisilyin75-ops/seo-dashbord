const TOKEN_KEY = 'scc:auth-token';

export function getToken()      { return localStorage.getItem(TOKEN_KEY) || ''; }
export function setToken(t)     { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); }
export const AUTH_EVENT         = 'scc:unauthorized';

function headers(body) {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: headers(body),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    document.dispatchEvent(new CustomEvent(AUTH_EVENT));
    const err = new Error('Unauthorized');
    err.unauthorized = true;
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ error: res.statusText }));
    const err = new Error(errBody.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // sites
  listSites:    () => request('GET',    '/api/sites'),
  createSite:   (data) => request('POST',   '/api/sites', data),
  updateSite:   (id, data) => request('PUT',    `/api/sites/${id}`, data),
  deleteSite:   (id) => request('DELETE', `/api/sites/${id}`),
  siteMetrics:  (id, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/sites/${id}/metrics${qs ? `?${qs}` : ''}`);
  },
  syncSiteMetrics: (id, days = 7) => request('POST', `/api/sites/${id}/sync-metrics?days=${days}`),
  siteValuations: (id, limit = 180) => request('GET', `/api/sites/${id}/valuations?limit=${limit}`),

  // articles
  listArticles: (siteId) => request('GET',    `/api/sites/${siteId}/articles`),
  // Paginated + filtered — возвращает { items, total, facets, limit, offset }.
  // filters: { q, type, status, tags: [], word_min, word_max, quality_min, quality_max, has_url, date_from, date_to, sort, limit, offset }
  searchArticles: (siteId, filters = {}) => {
    const qs = new URLSearchParams();
    qs.set('paged', '1');
    for (const [k, v] of Object.entries(filters)) {
      if (v == null || v === '') continue;
      if (Array.isArray(v)) v.forEach(x => qs.append(k, x));
      else qs.set(k, String(v));
    }
    const base = siteId ? `/api/sites/${siteId}/articles` : '/api/articles/search';
    return request('GET', `${base}?${qs.toString()}`);
  },
  bulkArticles: (article_ids, action, payload) =>
    request('POST', '/api/articles/bulk', { article_ids, action, payload }),
  createArticle:(siteId, data) => request('POST',   `/api/sites/${siteId}/articles`, data),
  updateArticle:(id, data) => request('PUT',    `/api/articles/${id}`, data),
  deleteArticle:(id) => request('DELETE', `/api/articles/${id}`),
  syncArticleWp: (id, direction = 'pull') => request('POST', `/api/articles/${id}/sync-wp?direction=${direction}`),
  syncAllWp:    (siteId) => request('POST', `/api/sites/${siteId}/articles/sync-all`),
  articleRevisions: (id, limit = 50) => request('GET', `/api/articles/${id}/revisions?limit=${limit}`),
  articleMeta:  (id) => request('GET', `/api/articles/${id}/meta`),

  // plan
  listPlan:     (siteId) => request('GET',    `/api/sites/${siteId}/plan`),
  createPlan:   (siteId, data) => request('POST',   `/api/sites/${siteId}/plan`, data),
  updatePlan:   (id, data) => request('PUT',    `/api/plan/${id}`, data),
  deletePlan:   (id) => request('DELETE', `/api/plan/${id}`),
  generateBrief: (id) => request('POST', `/api/plan/${id}/generate-brief`),
  siteProgress: (siteId) => request('GET', `/api/sites/${siteId}/progress`),

  // Agents
  listAgents:   () => request('GET', '/api/agents'),
  getAgent:     (id) => request('GET', `/api/agents/${id}`),
  updateAgent:  (id, data) => request('PUT', `/api/agents/${id}`, data),
  runAgent:     (id) => request('POST', `/api/agents/${id}/run`),
  agentRuns:    (id, limit = 20) => request('GET', `/api/agents/${id}/runs?limit=${limit}`),

  // ai
  aiCommand:    (command, context = {}) => request('POST', '/api/ai/command', { command, context }),
  aiSitePlan:   (data) => request('POST', '/api/ai/site-plan', data),
  aiCredits:    () => request('GET',  '/api/ai/credits'),

  // deploy
  listDeploys:  () => request('GET',  '/api/deploys'),
  createDeploy: (data) => request('POST', '/api/deploy', data),

  // log
  listLog:      (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/log${qs ? `?${qs}` : ''}`);
  },

  health: () => request('GET', '/api/health'),

  // Portfolio (gamification — Live Capitalization widget)
  portfolioValuation: () => request('GET', '/api/portfolio/valuation'),

  // User prefs (key/value JSON store)
  getPref:  (key) => request('GET', `/api/prefs/${encodeURIComponent(key)}`),
  setPref:  (key, value) => request('PUT', `/api/prefs/${encodeURIComponent(key)}`, { value }),
  delPref:  (key) => request('DELETE', `/api/prefs/${encodeURIComponent(key)}`),

  // Blog (мотивационная лента «что сделано»)
  listBlog:   ({ limit = 50, offset = 0, tag } = {}) => {
    const qs = new URLSearchParams();
    qs.set('limit', String(limit));
    qs.set('offset', String(offset));
    if (tag) qs.set('tag', tag);
    return request('GET', `/api/blog?${qs.toString()}`);
  },
  getBlog:    (id) => request('GET',    `/api/blog/${id}`),
  createBlog: (data) => request('POST',   '/api/blog', data),
  updateBlog: (id, data) => request('PUT',    `/api/blog/${id}`, data),
  deleteBlog: (id) => request('DELETE', `/api/blog/${id}`),

  // daily brief (health/pulse/idea/quick-win карточки для оператора)
  dailyBrief:       ({ siteId, refresh = false } = {}) => {
    const qs = new URLSearchParams();
    if (siteId) qs.set('siteId', siteId);
    if (refresh) qs.set('refresh', '1');
    const q = qs.toString();
    return request('GET', `/api/daily-brief${q ? `?${q}` : ''}`);
  },
};
