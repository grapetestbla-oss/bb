import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'popular'
    const userId = searchParams.get('userId')
    const includePending = searchParams.get('includePending') === 'true'

    const where: Record<string, unknown> = {}

    if (userId) {
      // When fetching user's own services, show all moderation statuses
      where.boosterId = userId
      if (!includePending) {
        where.active = true
      }
    } else {
      // Catalog: only show active and approved services
      where.active = true
      where.moderationStatus = 'approved'
    }

    if (category) {
      const categoryRecord = await db.category.findUnique({
        where: { slug: category },
      })
      if (categoryRecord) {
        where.categoryId = categoryRecord.id
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ]
    }

    let orderBy: Record<string, string> = {}
    switch (sort) {
      case 'price_asc':
        orderBy = { price: 'asc' }
        break
      case 'price_desc':
        orderBy = { price: 'desc' }
        break
      case 'rating':
        orderBy = { rating: 'desc' }
        break
      case 'newest':
        orderBy = { createdAt: 'desc' }
        break
      case 'popular':
      default:
        orderBy = { ordersCount: 'desc' }
        break
    }

    const services = await db.service.findMany({
      where,
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
      orderBy,
    })

    // Parse JSON fields for each service
    const parsedServices = services.map((service) => ({
      ...service,
      features: JSON.parse(service.features),
      requirements: JSON.parse(service.requirements),
    }))

    return NextResponse.json({ services: parsedServices })
  } catch (error) {
    console.error('Services GET error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      price,
      categoryId,
      boosterId,
      estimatedTime,
      features,
      requirements,
      image,
    } = body

    if (!title || !description || !price || !categoryId || !boosterId) {
      return NextResponse.json(
        { error: 'Заполните все обязательные поля' },
        { status: 400 }
      )
    }

    // Check the user's role — boosters and admins get auto-approved, others need moderation
    const user = await db.user.findUnique({ where: { id: boosterId } })
    const moderationStatus = user && (user.role === 'booster' || user.role === 'admin' || user.role === 'moderator')
      ? 'approved'
      : 'pending'

    const service = await db.service.create({
      data: {
        title,
        description,
        price: Number(price),
        image: image || null,
        categoryId,
        boosterId,
        estimatedTime: estimatedTime || '1-3 дня',
        features: JSON.stringify(features || []),
        requirements: JSON.stringify(requirements || []),
        moderationStatus,
      },
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

    // Create notification for moderators about new service pending review
    if (moderationStatus === 'pending') {
      const moderators = await db.user.findMany({
        where: { role: { in: ['moderator', 'admin'] } },
      })
      await db.notification.createMany({
        data: moderators.map((mod) => ({
          userId: mod.id,
          title: 'Новая услуга на проверке',
          message: `Услуга "${title}" от ${user?.username || 'пользователя'} ожидает модерации`,
          type: 'info',
        })),
      })
    }

    const { features: f, requirements: r, ...rest } = service
    const parsedService = {
      ...rest,
      features: JSON.parse(f),
      requirements: JSON.parse(r),
    }

    return NextResponse.json({ service: parsedService }, { status: 201 })
  } catch (error) {
    console.error('Services POST error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
