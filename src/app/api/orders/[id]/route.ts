import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const order = await db.order.findUnique({
      where: { id },
      include: {
        service: {
          include: {
            category: true,
            booster: {
              select: {
                id: true,
                username: true,
                avatar: true,
                rating: true,
                verified: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            username: true,
            avatar: true,
            email: true,
          },
        },
        booster: {
          select: {
            id: true,
            username: true,
            avatar: true,
            email: true,
            rating: true,
            verified: true,
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        reviews: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      )
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Order GET error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existingOrder = await db.order.findUnique({ where: { id } })
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.status !== undefined) updateData.status = body.status
    if (body.progress !== undefined) updateData.progress = Number(body.progress)
    if (body.boosterId !== undefined) updateData.boosterId = body.boosterId
    if (body.boosterNotes !== undefined) updateData.boosterNotes = body.boosterNotes
    if (body.escrowLocked !== undefined) updateData.escrowLocked = body.escrowLocked

    // If order is completed, set completedAt
    if (body.status === 'completed') {
      updateData.completedAt = new Date()
      updateData.progress = 100
      updateData.escrowLocked = false
    }

    const order = await db.order.update({
      where: { id },
      data: updateData,
      include: {
        service: true,
        client: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        booster: {
          select: {
            id: true,
            username: true,
            avatar: true,
            rating: true,
            verified: true,
          },
        },
      },
    })

    // Create notifications based on status change
    if (body.status) {
      const statusMessages: Record<string, { title: string; message: string; type: string }> = {
        in_progress: {
          title: 'Заказ в работе',
          message: `Заказ на услугу "${order.service.title}" взят в работу`,
          type: 'info',
        },
        completed: {
          title: 'Заказ выполнен',
          message: `Заказ на услугу "${order.service.title}" выполнен`,
          type: 'success',
        },
        disputed: {
          title: 'Спор по заказу',
          message: `Открыт спор по заказу "${order.service.title}"`,
          type: 'warning',
        },
        cancelled: {
          title: 'Заказ отменён',
          message: `Заказ на услугу "${order.service.title}" отменён`,
          type: 'error',
        },
      }

      const notificationData = statusMessages[body.status]
      if (notificationData) {
        // Notify client
        await db.notification.create({
          data: {
            userId: order.client.id,
            ...notificationData,
          },
        })
      }
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Order PATCH error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
