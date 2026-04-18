/**
 * Build-time метаинфа — инжектится Vite (см. vite.config.js define).
 * В dev-режиме значения тоже доступны (vite исполняет define на каждом серве).
 */

/* global __APP_VERSION__, __APP_COMMIT__, __APP_BUILD_DATE__ */

export const APP_VERSION    = typeof __APP_VERSION__    !== 'undefined' ? __APP_VERSION__    : 'dev';
export const APP_COMMIT     = typeof __APP_COMMIT__     !== 'undefined' ? __APP_COMMIT__     : 'local';
export const APP_BUILD_DATE = typeof __APP_BUILD_DATE__ !== 'undefined' ? __APP_BUILD_DATE__ : new Date().toISOString();

export function versionString() {
  return `v${APP_VERSION}`;
}

export function buildInfoLines() {
  const dt = new Date(APP_BUILD_DATE);
  return {
    version: APP_VERSION,
    commit: APP_COMMIT,
    date: isNaN(+dt) ? APP_BUILD_DATE : dt.toLocaleString('ru-RU'),
  };
}
