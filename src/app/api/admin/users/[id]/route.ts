import { db } from '@/lib/db'
import { guardAdmin, guardSuperAdmin, fail, ok } from '@/lib/api'
import { hashPassword } from '@/lib/auth'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { user, response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return fail('Некорректный запрос')

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return fail('Пользователь не найден', 404)

  const data: Record<string, unknown> = {}

  if (typeof body.role === 'string') {
    const role = body.role.toUpperCase()
    if (!['USER', 'ADMIN', 'SUPERADMIN'].includes(role)) return fail('Недопустимая роль')
    // Назначать и снимать администраторов может только главный администратор
    const superGuard = await guardSuperAdmin()
    if (superGuard.response) return superGuard.response
    if (target.role === 'SUPERADMIN' && target.id !== user.id && role !== 'SUPERADMIN') {
      return fail('Нельзя понизить другого главного администратора', 403)
    }
    if (target.id === user.id && role !== 'SUPERADMIN') {
      return fail('Нельзя снять права с самого себя', 403)
    }
    data.role = role
  }

  if (typeof body.blocked === 'boolean') {
    if (target.id === user.id) return fail('Нельзя заблокировать самого себя', 403)
    if (target.role === 'SUPERADMIN' && user.role !== 'SUPERADMIN') {
      return fail('Недостаточно прав', 403)
    }
    data.blocked = body.blocked
    if (body.blocked) await db.session.deleteMany({ where: { userId: id } })
  }

  if (typeof body.displayName === 'string' && body.displayName.trim()) data.displayName = body.displayName.trim()
  if (typeof body.gameNick === 'string') data.gameNick = body.gameNick.trim() || null
  if (typeof body.platform === 'string') data.platform = body.platform.trim() || null

  if (typeof body.newPassword === 'string' && body.newPassword) {
    if (body.newPassword.length < 6) return fail('Пароль должен содержать минимум 6 символов')
    if (target.role === 'SUPERADMIN' && target.id !== user.id) {
      return fail('Нельзя менять пароль главного администратора', 403)
    }
    data.password = await hashPassword(body.newPassword)
    await db.session.deleteMany({ where: { userId: id } })
  }

  const updated = await db.user.update({
    where: { id },
    data,
    select: { id: true, username: true, displayName: true, role: true, blocked: true },
  })
  return ok({ user: updated })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { user, response } = await guardSuperAdmin()
  if (response) return response

  const { id } = await params
  if (id === user.id) return fail('Нельзя удалить собственный аккаунт', 403)

  const target = await db.user.findUnique({ where: { id } })
  if (!target) return fail('Пользователь не найден', 404)
  if (target.role === 'SUPERADMIN') return fail('Нельзя удалить главного администратора', 403)

  await db.user.delete({ where: { id } })
  return ok({ success: true })
}
