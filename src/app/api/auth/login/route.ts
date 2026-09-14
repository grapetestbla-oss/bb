import { db } from '@/lib/db'
import { createSession, verifyPassword } from '@/lib/auth'
import { fail, ok } from '@/lib/api'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return fail('Некорректный запрос')

  const login = String(body.login ?? body.username ?? '').trim()
  const password = String(body.password ?? '')
  if (!login || !password) return fail('Введите логин и пароль')

  const user = await db.user.findFirst({
    where: { OR: [{ username: login }, { email: login.toLowerCase() }] },
  })
  if (!user) return fail('Неверный логин или пароль', 401)
  if (user.blocked) return fail('Аккаунт заблокирован администрацией', 403)

  const valid = await verifyPassword(password, user.password)
  if (!valid) return fail('Неверный логин или пароль', 401)

  await createSession(user.id)
  return ok({ id: user.id, username: user.username, role: user.role })
}
