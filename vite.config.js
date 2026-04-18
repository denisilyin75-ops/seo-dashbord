import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- build-time версионная метаинфа ----
// Внедряется как глобальные константы: __APP_VERSION__, __APP_COMMIT__, __APP_BUILD_DATE__.
// Читаются клиентским кодом через src/utils/version.js.

function readPackageVersion() {
  try {
    return JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')).version;
  } catch { return 'unknown'; }
}

function readGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: __dirname }).toString().trim();
  } catch { return 'nogit'; }
}

const APP_VERSION = readPackageVersion();
const APP_COMMIT = readGitCommit();
const APP_BUILD_DATE = new Date().toISOString();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__:    JSON.stringify(APP_VERSION),
    __APP_COMMIT__:     JSON.stringify(APP_COMMIT),
    __APP_BUILD_DATE__: JSON.stringify(APP_BUILD_DATE),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
