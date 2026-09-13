import { db } from '@/lib/db'
import { hashPassword, requireUser, verifyPassword } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'

export async function PATCH(request: Request) {
  try {
    const session = await requireUser()
    const { login, email, contact, currentPassword, newPassword } = await request.json()

    const user = await db.user.findUnique({ where: { id: session.id } })
    if (!user) return fail('Пользователь не найден', 404)

    const data: Record<string, string> = {}

    if (login && login !== user.login) {
      if (String(login).length < 3) return fail('Логин должен быть не короче 3 символов')
      const taken = await db.user.findUnique({ where: { login: String(login) } })
      if (taken) return fail('Такой логин уже занят', 409)
      data.login = String(login)
    }

    if (email && String(email).toLowerCase() !== user.email) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) return fail('Некорректный email')
      const taken = await db.user.findUnique({ where: { email: String(email).toLowerCase() } })
      if (taken) return fail('Такой email уже занят', 409)
      data.email = String(email).toLowerCase()
    }

    if (contact !== undefined) data.contact = String(contact || '')

    if (newPassword) {
      if (!currentPassword) return fail('Введите текущий пароль')
      if (!(await verifyPassword(String(currentPassword), user.password))) {
        return fail('Текущий пароль неверен', 403)
      }
      if (String(newPassword).length < 6) return fail('Новый пароль должен быть не короче 6 символов')
      data.password = await hashPassword(String(newPassword))
    }

    const updated = await db.user.update({ where: { id: user.id }, data })
    return ok({
      user: {
        id: updated.id,
        login: updated.login,
        email: updated.email,
        role: updated.role,
        contact: updated.contact,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
