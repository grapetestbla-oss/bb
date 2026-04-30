import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const service = await db.service.findUnique({
      where: { id },
      include: {
        category: true,
        booster: {
          select: {
            id: true,
            username: true,
            avatar: true,
            rating: true,
            verified: true,
            reviewsCount: true,
          },
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
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!service) {
      return NextResponse.json(
        { error: 'Услуга не найдена' },
        { status: 404 }
      )
    }

    const parsedService = {
      ...service,
      features: JSON.parse(service.features),
      requirements: JSON.parse(service.requirements),
    }

    return NextResponse.json({ service: parsedService })
  } catch (error) {
    console.error('Service GET error:', error)
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

    const existingService = await db.service.findUnique({ where: { id } })
    if (!existingService) {
      return NextResponse.json(
        { error: 'Услуга не найдена' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.price !== undefined) updateData.price = Number(body.price)
    if (body.image !== undefined) updateData.image = body.image
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
    if (body.estimatedTime !== undefined) updateData.estimatedTime = body.estimatedTime
    if (body.active !== undefined) updateData.active = body.active
    if (body.features !== undefined) updateData.features = JSON.stringify(body.features)
    if (body.requirements !== undefined) updateData.requirements = JSON.stringify(body.requirements)
    if (body.moderationStatus !== undefined) updateData.moderationStatus = body.moderationStatus
    if (body.rejectionReason !== undefined) updateData.rejectionReason = body.rejectionReason

    const service = await db.service.update({
      where: { id },
      data: updateData,
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
    })

    const parsedService = {
      ...service,
      features: JSON.parse(service.features),
      requirements: JSON.parse(service.requirements),
    }

    return NextResponse.json({ service: parsedService })
  } catch (error) {
    console.error('Service PATCH error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existingService = await db.service.findUnique({ where: { id } })
    if (!existingService) {
      return NextResponse.json(
        { error: 'Услуга не найдена' },
        { status: 404 }
      )
    }

    // Soft delete — set active to false
    const service = await db.service.update({
      where: { id },
      data: { active: false },
    })

    return NextResponse.json({ service, message: 'Услуга деактивирована' })
  } catch (error) {
    console.error('Service DELETE error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
