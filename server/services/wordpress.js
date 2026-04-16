/**
 * WordPress REST API client.
 * Авторизация — Application Passwords (User → Profile → Application Passwords).
 *
 * Использование:
 *   const wp = new WordPressClient({ apiUrl, user, appPassword });
 *   const posts = await wp.getPosts({ per_page: 100 });
 */

export class WordPressNotConfiguredError extends Error {
  constructor(field) { super(`WordPress not configured: missing "${field}"`); this.code = 'WP_NOT_CONFIGURED'; }
}

export class WordPressApiError extends Error {
  constructor(status, body) {
    super(`WP API ${status}: ${typeof body === 'string' ? body : JSON.stringify(body).slice(0, 300)}`);
    this.status = status;
    this.body = body;
  }
}

export class WordPressClient {
  /**
   * @param {object} cfg
   * @param {string} cfg.apiUrl — например "https://popolkam.ru/wp-json/wp/v2" или базовый "https://popolkam.ru"
   * @param {string} cfg.user
   * @param {string} cfg.appPassword
   * @param {number} [cfg.timeout=15000]
   */
  constructor({ apiUrl, user, appPassword, timeout = 15000 }) {
    if (!apiUrl) throw new WordPressNotConfiguredError('apiUrl');
    if (!user) throw new WordPressNotConfiguredError('user');
    if (!appPassword) throw new WordPressNotConfiguredError('appPassword');
    // Нормализация: если передали корень сайта — добавить /wp-json/wp/v2
    this.baseUrl = apiUrl.replace(/\/+$/, '');
    if (!/\/wp-json\/wp\/v2$/.test(this.baseUrl)) {
      this.baseUrl += '/wp-json/wp/v2';
    }
    this.auth = Buffer.from(`${user}:${appPassword}`).toString('base64');
    this.timeout = timeout;
  }

  /** @private */
  async _req(method, path, { query, body } = {}) {
    let url = `${this.baseUrl}${path}`;
    if (query) {
      const qs = new URLSearchParams(query).toString();
      if (qs) url += `?${qs}`;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeout);
    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Basic ${this.auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: body != null ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const text = await res.text();
      let parsed = text;
      try { parsed = JSON.parse(text); } catch { /* keep text */ }
      if (!res.ok) throw new WordPressApiError(res.status, parsed);
      return parsed;
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------- Posts ----------
  /** GET /posts — список постов с метаданными */
  async getPosts({ per_page = 100, page = 1, status = 'any', search } = {}) {
    return this._req('GET', '/posts', { query: { per_page, page, status, ...(search ? { search } : {}) } });
  }

  /** GET /posts/:id */
  async getPost(id) {
    return this._req('GET', `/posts/${id}`);
  }

  /** POST /posts — создать */
  async createPost({ title, content, status = 'draft', categories, tags, slug, excerpt }) {
    return this._req('POST', '/posts', {
      body: { title, content, status, categories, tags, slug, excerpt },
    });
  }

  /** PUT /posts/:id — обновить */
  async updatePost(id, data) {
    return this._req('PUT', `/posts/${id}`, { body: data });
  }

  /** DELETE /posts/:id?force=true — окончательное удаление (иначе в trash) */
  async deletePost(id, { force = false } = {}) {
    return this._req('DELETE', `/posts/${id}`, { query: { force: String(force) } });
  }

  // ---------- Categories ----------
  async getCategories({ per_page = 100 } = {}) {
    return this._req('GET', '/categories', { query: { per_page } });
  }

  async createCategory({ name, slug, description, parent }) {
    return this._req('POST', '/categories', { body: { name, slug, description, parent } });
  }

  // ---------- Health ----------
  /** Проверить креды: GET /users/me */
  async whoami() {
    return this._req('GET', '/users/me');
  }
}

/** Хелпер: построить клиента по строке БД. Возвращает null, если креды не настроены. */
export function clientFromSiteRow(row) {
  if (!row?.wp_api_url || !row?.wp_user || !row?.wp_app_password) return null;
  return new WordPressClient({
    apiUrl: row.wp_api_url,
    user: row.wp_user,
    appPassword: row.wp_app_password,
  });
}
