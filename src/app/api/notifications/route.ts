import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId обязателен' },
        { status: 400 }
      )
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const unreadCount = notifications.filter((n) => !n.read).length

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, title, message, type } = body

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'userId, title и message обязательны' },
        { status: 400 }
      )
    }

    const notification = await db.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'info',
      },
    })

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('Notifications POST error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
