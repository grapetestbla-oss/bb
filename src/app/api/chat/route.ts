import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, senderId, content } = body

    if (!orderId || !senderId || !content) {
      return NextResponse.json(
        { error: 'orderId, senderId и content обязательны' },
        { status: 400 }
      )
    }

    const message = await db.chatMessage.create({
      data: {
        orderId,
        senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error('Chat POST error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
