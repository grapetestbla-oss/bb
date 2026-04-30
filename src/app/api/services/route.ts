import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sort = searchParams.get('sort') || 'popular'

    const where: Record<string, unknown> = { active: true }

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
