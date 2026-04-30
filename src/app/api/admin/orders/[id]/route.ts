import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, escrowLocked, moderatorId } = body

    const existingOrder = await db.order.findUnique({
      where: { id },
      include: { service: true },
    })
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Заказ не найден' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status
    if (escrowLocked !== undefined) updateData.escrowLocked = escrowLocked

    // If completing order, set completedAt
    if (status === 'completed') {
      updateData.completedAt = new Date()
      updateData.progress = 100
      updateData.escrowLocked = false
    }

    // If refunding, unlock escrow
    if (status === 'refunded') {
      updateData.escrowLocked = false
    }

    const order = await db.order.update({
      where: { id },
      data: updateData,
      include: {
        service: {
          select: {
            id: true,
            title: true,
          },
        },
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
          },
        },
      },
    })

    // Create moderator log
    if (moderatorId) {
      const changes: string[] = []
      if (status !== undefined) changes.push(`status: ${status}`)
      if (escrowLocked !== undefined) changes.push(`escrowLocked: ${escrowLocked}`)

      await db.moderatorLog.create({
        data: {
          moderatorId,
          action: 'update_order',
          target: `order:${id}`,
          details: changes.join(', '),
        },
      })
    }

    // Notify relevant users
    if (status) {
      await db.notification.create({
        data: {
          userId: order.client.id,
          title: 'Обновление заказа',
          message: `Статус заказа "${order.service.title}" изменён на: ${status}`,
          type: status === 'completed' ? 'success' : status === 'refunded' ? 'info' : 'warning',
        },
      })

      if (order.booster) {
        await db.notification.create({
          data: {
            userId: order.booster.id,
            title: 'Обновление заказа',
            message: `Статус заказа "${order.service.title}" изменён на: ${status}`,
            type: 'info',
          },
        })
      }
    }

    return NextResponse.json({ order })
  } catch (error) {
    console.error('Admin Order PATCH error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
