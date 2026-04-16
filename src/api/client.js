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

  // articles
  listArticles: (siteId) => request('GET',    `/api/sites/${siteId}/articles`),
  createArticle:(siteId, data) => request('POST',   `/api/sites/${siteId}/articles`, data),
  updateArticle:(id, data) => request('PUT',    `/api/articles/${id}`, data),
  deleteArticle:(id) => request('DELETE', `/api/articles/${id}`),
  syncArticleWp: (id, direction = 'pull') => request('POST', `/api/articles/${id}/sync-wp?direction=${direction}`),
  syncAllWp:    (siteId) => request('POST', `/api/sites/${siteId}/articles/sync-all`),

  // plan
  listPlan:     (siteId) => request('GET',    `/api/sites/${siteId}/plan`),
  createPlan:   (siteId, data) => request('POST',   `/api/sites/${siteId}/plan`, data),
  updatePlan:   (id, data) => request('PUT',    `/api/plan/${id}`, data),
  deletePlan:   (id) => request('DELETE', `/api/plan/${id}`),

  // ai
  aiCommand:    (command, context = {}) => request('POST', '/api/ai/command', { command, context }),
  aiSitePlan:   (data) => request('POST', '/api/ai/site-plan', data),

  // deploy
  listDeploys:  () => request('GET',  '/api/deploys'),
  createDeploy: (data) => request('POST', '/api/deploy', data),

  // log
  listLog:      (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/api/log${qs ? `?${qs}` : ''}`);
  },

  health: () => request('GET', '/api/health'),
};
