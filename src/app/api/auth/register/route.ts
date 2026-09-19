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

    const hashed = await hashPassword(String(password))

    // Первый зарегистрировавшийся становится владельцем магазина.
    // Проверка и создание в одной транзакции, чтобы две одновременные
    // регистрации не выдали админку обоим. Скрытые служебные аккаунты (root)
    // в подсчёте не учитываются, иначе первый реальный клиент не станет админом.
    const user = await db.$transaction(async (tx) => {
      const isFirst = (await tx.user.count({ where: { hidden: false } })) === 0
      return tx.user.create({
        data: {
          login: String(login),
          email: String(email).toLowerCase(),
          password: hashed,
          role: isFirst ? 'admin' : 'user',
          contact: contact ? String(contact) : null,
        },
      })
    })

    if (user.role === 'admin') {
      await db.notification.create({
        data: {
          userId: user.id,
          type: 'info',
          title: 'Вы владелец магазина',
          body:
            `Аккаунт ${user.login} зарегистрирован первым и получил доступ к панели управления. ` +
            'Заведите пилотов, сетапы и подключите платёжные системы.',
          link: '/admin',
        },
      })
    } else {
      await db.notification.create({
        data: {
          userId: null,
          type: 'info',
          title: 'Новая регистрация',
          body: `Зарегистрирован пользователь ${user.login}`,
          link: '/admin?tab=users',
        },
      })
    }

    await setSessionCookie(user.id)
    return ok({ user: { id: user.id, login: user.login, email: user.email, role: user.role, contact: user.contact } })
  } catch (error) {
    return handleError(error)
  }
}
