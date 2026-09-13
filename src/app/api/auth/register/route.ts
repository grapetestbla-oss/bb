import { db } from '@/lib/db'
import { hashPassword, setSessionCookie } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'

export async function POST(request: Request) {
  try {
    const { login, email, password, contact } = await request.json()

    if (!login || !email || !password) {
      return fail('Логин, email и пароль обязательны')
    }
    if (String(login).length < 3) return fail('Логин должен быть не короче 3 символов')
    if (String(password).length < 6) return fail('Пароль должен быть не короче 6 символов')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email))) return fail('Некорректный email')

    const exists = await db.user.findFirst({
      where: { OR: [{ login: String(login) }, { email: String(email).toLowerCase() }] },
    })
    if (exists) return fail('Пользователь с таким логином или email уже существует', 409)

    const user = await db.user.create({
      data: {
        login: String(login),
        email: String(email).toLowerCase(),
        password: await hashPassword(String(password)),
        contact: contact ? String(contact) : null,
      },
    })

    await db.notification.create({
      data: {
        userId: null,
        type: 'info',
        title: 'Новая регистрация',
        body: `Зарегистрирован пользователь ${user.login}`,
        link: '/admin?tab=users',
      },
    })

    await setSessionCookie(user.id)
    return ok({ user: { id: user.id, login: user.login, email: user.email, role: user.role, contact: user.contact } })
  } catch (error) {
    return handleError(error)
  }
}
