/**
 * Применяет схему к базе и заполняет её стартовыми данными.
 * Используется при старте контейнера, когда база доступна только в рантайме.
 */
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { resolveDbEnv } from './db-env.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { directUrl } = resolveDbEnv()
const env = { ...process.env, ...(directUrl ? { DIRECT_URL: directUrl } : {}) }
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit', env })
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

run(process.execPath, ['scripts/prepare-db.mjs'])
run(npx, ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'])
run(process.execPath, ['prisma/seed.mjs'])
