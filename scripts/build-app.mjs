/**
 * Сборка приложения без обращения к базе: нужна для Docker,
 * где миграции и сид выполняются при старте контейнера (scripts/db-deploy.mjs).
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' })
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

run(process.execPath, ['scripts/prepare-db.mjs'])
run(npx, ['prisma', 'generate'])
run(npx, ['next', 'build'])

const standalone = join(root, '.next', 'standalone')
if (existsSync(standalone)) {
  cpSync(join(root, '.next', 'static'), join(standalone, '.next', 'static'), { recursive: true })
  cpSync(join(root, 'public'), join(standalone, 'public'), { recursive: true })
  console.log('✓ Статика скопирована в .next/standalone')
}
