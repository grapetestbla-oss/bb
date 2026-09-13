import { db } from '@/lib/db'
import { setSessionCookie, verifyPassword } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'

export async function POST(request: Request) {
  try {
    const { login, password } = await request.json()
    if (!login || !password) return fail('Введите логин и пароль')

    const value = String(login).trim()
    const user = await db.user.findFirst({
      where: { OR: [{ login: value }, { email: value.toLowerCase() }] },
    })
    if (!user) return fail('Неверный логин или пароль', 401)
    if (!(await verifyPassword(String(password), user.password))) {
      return fail('Неверный логин или пароль', 401)
    }

    await setSessionCookie(user.id)
    return ok({ user: { id: user.id, login: user.login, email: user.email, role: user.role, contact: user.contact } })
  } catch (error) {
    return handleError(error)
  }
}
