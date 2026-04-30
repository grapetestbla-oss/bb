import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (userId && role === 'client') {
      where.clientId = userId
    } else if (userId && role === 'booster') {
      where.boosterId = userId
    } else if (userId) {
      where.OR = [{ clientId: userId }, { boosterId: userId }]
    }

    if (status) {
      where.status = status
    }

    const orders = await db.order.findMany({
      where,
      include: {
        service: {
          include: {
            category: true,
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
            rating: true,
            verified: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('Orders GET error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { serviceId, clientId, clientNotes } = body

    if (!serviceId || !clientId) {
      return NextResponse.json(
        { error: 'serviceId и clientId обязательны' },
        { status: 400 }
      )
    }

    // Get service price
    const service = await db.service.findUnique({ where: { id: serviceId } })
    if (!service) {
      return NextResponse.json(
        { error: 'Услуга не найдена' },
        { status: 404 }
      )
    }

    if (!service.active) {
      return NextResponse.json(
        { error: 'Услуга недоступна' },
        { status: 400 }
      )
    }

    // Create order with escrow
    const order = await db.order.create({
      data: {
        serviceId,
        clientId,
        price: service.price,
        escrowLocked: true,
        clientNotes: clientNotes || null,
        status: 'pending',
      },
      include: {
        service: {
          include: {
            category: true,
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
            rating: true,
            verified: true,
          },
        },
      },
    })

    // Increment service orders count
    await db.service.update({
      where: { id: serviceId },
      data: { ordersCount: { increment: 1 } },
    })

    // Create notification for the booster
    await db.notification.create({
      data: {
        userId: service.boosterId,
        title: 'Новый заказ',
        message: `Поступил новый заказ на услугу "${service.title}"`,
        type: 'info',
      },
    })

    return NextResponse.json({ order }, { status: 201 })
  } catch (error) {
    console.error('Orders POST error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
