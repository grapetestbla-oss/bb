import { db } from '@/lib/db'
import { createSession, hashPassword } from '@/lib/auth'
import { fail, ok } from '@/lib/api'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) return fail('Некорректный запрос')

  const username = String(body.username ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const displayName = String(body.displayName ?? '').trim() || username

  if (username.length < 3) return fail('Логин должен содержать минимум 3 символа')
  if (!/^[A-Za-z0-9_.-]+$/.test(username)) return fail('Логин может содержать только латиницу, цифры, _ . -')
  if (password.length < 6) return fail('Пароль должен содержать минимум 6 символов')
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Некорректный email')

  const exists = await db.user.findFirst({
    where: { OR: [{ username }, ...(email ? [{ email }] : [])] },
  })
  if (exists) return fail('Пользователь с таким логином или email уже существует', 409)

  const user = await db.user.create({
    data: {
      username,
      email: email || null,
      password: await hashPassword(password),
      displayName,
      gameNick: String(body.gameNick ?? '').trim() || null,
      platform: String(body.platform ?? '').trim() || null,
    },
  })

  await createSession(user.id)
  return ok({ id: user.id, username: user.username, role: user.role })
}
