# Multi-stage Dockerfile для SEO Command Center
# Один контейнер: Express отдаёт и /api/*, и собранный фронт (dist/)

# ============================================================
# Stage 1: build (frontend + production node_modules)
# ============================================================
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Build tools для нативного better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

# Копируем источники и собираем фронт
COPY . .
RUN npm run build

# Удаляем dev-зависимости из node_modules
RUN npm prune --omit=dev

# ============================================================
# Stage 2: production
# ============================================================
FROM node:20-bookworm-slim AS prod
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Только runtime файлы
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
# docs/ нужен для code-review-agent (api-reference gen, exit-readiness scorecard).
# Включает api-reference.md, architecture.md, exit-readiness.md, security-audit.md и т.д.
COPY --from=build /app/docs ./docs
# .env.example для secret_hygiene check в scorecard
COPY --from=build /app/.env.example ./.env.example

# Каталог для SQLite (mount volume извне)
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3001

# Healthcheck — проверяет что Express отвечает
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Корректная обработка SIGTERM
STOPSIGNAL SIGTERM

CMD ["node", "server/index.js"]
