# ---- Этап 1: зависимости ----
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY prisma ./prisma/
COPY scripts ./scripts/

RUN npm install -g bun && bun install --frozen-lockfile

# ---- Этап 2: сборка ----
FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g bun
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Клиент Prisma генерируется под конкретный тип базы, поэтому тип задаётся при сборке.
# По умолчанию PostgreSQL; для SQLite собирайте с
#   docker build --build-arg DATABASE_URL="file:../db/f1icons.db" .
ARG DATABASE_URL="postgresql://user:password@db:5432/f1icons"
ENV DATABASE_URL=$DATABASE_URL

# Сборка не обращается к базе: миграции и сид выполняются при старте контейнера
RUN bun run build:app

# ---- Этап 3: продакшен ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma CLI и схема нужны, чтобы применить миграции при старте
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.bin ./node_modules/.bin

RUN mkdir -p ./db && chown -R nextjs:nodejs ./db ./prisma

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "node scripts/db-deploy.mjs && node server.js"]
