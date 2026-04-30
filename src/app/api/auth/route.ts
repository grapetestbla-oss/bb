import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'login') {
      const { email, password } = body

      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email и пароль обязательны' },
          { status: 400 }
        )
      }

      const user = await db.user.findUnique({ where: { email } })

      if (!user) {
        return NextResponse.json(
          { error: 'Пользователь не найден' },
          { status: 401 }
        )
      }

      if (user.blocked) {
        return NextResponse.json(
          { error: 'Аккаунт заблокирован' },
          { status: 403 }
        )
      }

      // Simple plain text comparison for demo
      if (user.password !== password) {
        return NextResponse.json(
          { error: 'Неверный пароль' },
          { status: 401 }
        )
      }

      const { password: _, ...userWithoutPassword } = user
      return NextResponse.json({ user: userWithoutPassword })
    }

    if (action === 'register') {
      const { email, username, password } = body

      if (!email || !username || !password) {
        return NextResponse.json(
          { error: 'Все поля обязательны' },
          { status: 400 }
        )
      }

      const existingEmail = await db.user.findUnique({ where: { email } })
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email уже зарегистрирован' },
          { status: 409 }
        )
      }

      const existingUsername = await db.user.findUnique({ where: { username } })
      if (existingUsername) {
        return NextResponse.json(
          { error: 'Имя пользователя уже занято' },
          { status: 409 }
        )
      }

      // Store plain text password for demo purposes
      const user = await db.user.create({
        data: {
          email,
          username,
          password,
          role: 'client',
        },
      })

      const { password: _, ...userWithoutPassword } = user
      return NextResponse.json({ user: userWithoutPassword }, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Неизвестное действие. Используйте action: login или register' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
