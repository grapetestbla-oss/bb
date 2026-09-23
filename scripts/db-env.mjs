import './load-env.mjs'

/**
 * Разбирает подключение к базе.
 *
 * url        — основная строка подключения (на хостинге обычно через пул соединений)
 * directUrl  — прямое подключение; нужно для миграций, потому что через пул
 *              (PgBouncer) они не проходят. Neon на Vercel отдаёт его как
 *              DATABASE_URL_UNPOOLED, другие провайдеры — как DIRECT_URL.
 */
export function resolveDbEnv() {
  const url = process.env.DATABASE_URL ?? ''
  const directUrl =
    process.env.DIRECT_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    ''

  return {
    url,
    directUrl,
    isPostgres: /^postgres(ql)?:\/\//.test(url),
    isSqlite: url.startsWith('file:'),
    onHosting: Boolean(process.env.VERCEL || process.env.RENDER || process.env.CI),
  }
}
