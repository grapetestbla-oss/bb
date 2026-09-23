/**
 * Подгоняет datasource в prisma/schema.prisma под текущий DATABASE_URL.
 *
 * Локально (DATABASE_URL=file:...) используется SQLite и менять ничего не нужно,
 * на хостинге (postgres://...) провайдер переключается на PostgreSQL.
 * Запускается автоматически из scripts/build.mjs и из `bun run setup`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { resolveDbEnv } from './db-env.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schemaPath = join(root, 'prisma', 'schema.prisma')
const { url, directUrl, isPostgres, isSqlite, onHosting } = resolveDbEnv()

if (!url) {
  console.error(
    '\n✖ Не задана переменная окружения DATABASE_URL.\n' +
      '  Локально: скопируйте .env.example в .env (SQLite).\n' +
      '  На хостинге: подключите базу PostgreSQL в настройках проекта.\n',
  )
  process.exit(1)
}

if (isSqlite && onHosting) {
  console.error(
    '\n✖ SQLite не подходит для хостинга: файловая система там не сохраняется между перезапусками,\n' +
      '  и все аккаунты, заявки и таблицы зачёта будут теряться.\n' +
      '  Подключите бесплатную базу PostgreSQL (например Neon) и укажите её строку в DATABASE_URL.\n',
  )
  process.exit(1)
}

if (!isPostgres && !isSqlite) {
  console.error('\n✖ Неподдерживаемый DATABASE_URL: ожидается file:… (SQLite) или postgresql://…\n')
  process.exit(1)
}

const provider = isPostgres ? 'postgresql' : 'sqlite'
const datasource = [
  'datasource db {',
  `  provider = "${provider}"`,
  '  url      = env("DATABASE_URL")',
  // Прямое подключение нужно только для миграций мимо пула соединений.
  ...(isPostgres && directUrl ? ['  directUrl = env("DIRECT_URL")'] : []),
  '}',
].join('\n')

const schema = readFileSync(schemaPath, 'utf8')
const patched = schema.replace(/datasource db \{[^}]*\}/, datasource)

if (patched !== schema) {
  writeFileSync(schemaPath, patched)
}
console.log(
  `✓ База данных: ${provider}${isPostgres && directUrl ? ' (миграции через прямое подключение)' : ''}`,
)
