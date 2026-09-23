/**
 * Сборка проекта: подготовка схемы под текущую базу, миграция, сид и next build.
 * Работает и локально (SQLite), и на хостинге (PostgreSQL).
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { resolveDbEnv } from './db-env.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { directUrl } = resolveDbEnv()

// Prisma читает прямое подключение только из DIRECT_URL — приводим к одному имени.
const env = { ...process.env, ...(directUrl ? { DIRECT_URL: directUrl } : {}) }
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit', env })
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

run(process.execPath, ['scripts/prepare-db.mjs'])
run(npx, ['prisma', 'generate'])
run(npx, ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'])
run(process.execPath, ['prisma/seed.mjs'])
run(npx, ['next', 'build'])

// Для standalone-сборки (Docker, свой сервер) докладываем статику рядом с сервером.
const standalone = join(root, '.next', 'standalone')
if (existsSync(standalone)) {
  cpSync(join(root, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true })
  cpSync(join(root, 'public'), join(standalone, 'public'), { recursive: true })
  console.log('✓ Статика скопирована в .next/standalone')
}
