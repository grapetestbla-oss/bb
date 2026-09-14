import { db } from '@/lib/db'
import { guardUser, fail, ok } from '@/lib/api'
import { hashPassword, verifyPassword } from '@/lib/auth'

export async function PATCH(request: Request) {
  const { user, response } = await guardUser()
  if (response) return response

  const body = await request.json().catch(() => null)
  if (!body) return fail('Некорректный запрос')

  const data: Record<string, unknown> = {}
  if (typeof body.displayName === 'string' && body.displayName.trim()) data.displayName = body.displayName.trim()
  if (typeof body.gameNick === 'string') data.gameNick = body.gameNick.trim() || null
  if (typeof body.platform === 'string') data.platform = body.platform.trim() || null
  if (typeof body.country === 'string') data.country = body.country.trim() || null
  if (typeof body.bio === 'string') data.bio = body.bio.trim() || null
  if (typeof body.avatar === 'string') data.avatar = body.avatar.trim() || null
  if (typeof body.email === 'string') {
    const email = body.email.trim().toLowerCase()
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Некорректный email')
    if (email) {
      const busy = await db.user.findFirst({ where: { email, NOT: { id: user.id } } })
      if (busy) return fail('Этот email уже занят', 409)
    }
    data.email = email || null
  }

  if (body.newPassword) {
    const newPassword = String(body.newPassword)
    if (newPassword.length < 6) return fail('Новый пароль должен содержать минимум 6 символов')
    const current = await db.user.findUnique({ where: { id: user.id } })
    const valid = current && (await verifyPassword(String(body.currentPassword ?? ''), current.password))
    if (!valid) return fail('Текущий пароль указан неверно', 403)
    data.password = await hashPassword(newPassword)
  }

  await db.user.update({ where: { id: user.id }, data })
  return ok({ success: true })
}
