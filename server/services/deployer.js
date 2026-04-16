/**
 * Deployer — обёртка над server/scripts/deploy-wp.sh.
 *
 * Два режима:
 *   1. n8n  — POST к N8N_WEBHOOK_BASE/deploy-wp с конфигом (рекомендуемый)
 *   2. ssh  — node-ssh к SERVER_SSH_HOST и запуск bash-скрипта (требует node-ssh)
 *
 * Пока используется только режим n8n (для ssh нужно установить опционально).
 */

export class DeployerNotConfiguredError extends Error {
  constructor(reason) { super(`Deployer not configured: ${reason}`); this.code = 'DEPLOYER_NOT_CONFIGURED'; }
}

/**
 * Запустить деплой WordPress.
 * @param {object} cfg  { domain, db_name, db_user, db_pass, wp_title, wp_admin_user,
 *                       wp_admin_pass, wp_admin_email, theme, categories }
 * @returns {Promise<{ ok: boolean, mode: 'n8n'|'ssh'|'stub', log?: any }>}
 */
export async function deployWordpress(cfg) {
  const n8nBase = process.env.N8N_WEBHOOK_BASE;

  if (n8nBase) {
    const url = `${n8nBase.replace(/\/+$/, '')}/deploy-wp`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    });
    if (!res.ok) throw new Error(`n8n webhook ${res.status}: ${await res.text()}`);
    return { ok: true, mode: 'n8n', log: await res.json().catch(() => null) };
  }

  // TODO: ssh режим — установить node-ssh, добавить SERVER_SSH_HOST/USER/KEY_PATH
  return {
    ok: false,
    mode: 'stub',
    log: 'Deployer не сконфигурирован. Задайте N8N_WEBHOOK_BASE в .env или дополните режим ssh.',
  };
}
