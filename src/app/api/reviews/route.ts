import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('serviceId')
    const targetId = searchParams.get('targetId')

    const where: Record<string, unknown> = {}

    if (serviceId) {
      where.serviceId = serviceId
    }

    if (targetId) {
      where.targetId = targetId
    }

    const reviews = await db.review.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ reviews })
  } catch (error) {
    console.error('Reviews GET error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, serviceId, authorId, targetId, rating, comment } = body

    if (!orderId || !serviceId || !authorId || !targetId || !rating || !comment) {
      return NextResponse.json(
        { error: 'Все поля обязательны' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Рейтинг должен быть от 1 до 5' },
        { status: 400 }
      )
    }

    // Check if review already exists for this order
    const existingReview = await db.review.findFirst({
      where: { orderId },
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'Отзыв на этот заказ уже оставлен' },
        { status: 409 }
      )
    }

    const review = await db.review.create({
      data: {
        orderId,
        serviceId,
        authorId,
        targetId,
        rating: Number(rating),
        comment,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    })

    // Update service rating
    const serviceReviews = await db.review.findMany({
      where: { serviceId },
      select: { rating: true },
    })

    const totalRating = serviceReviews.reduce((sum, r) => sum + r.rating, 0)
    const avgRating = serviceReviews.length > 0 ? totalRating / serviceReviews.length : 0

    await db.service.update({
      where: { id: serviceId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        reviewsCount: serviceReviews.length,
      },
    })

    // Update booster (target) rating
    const boosterReviews = await db.review.findMany({
      where: { targetId },
      select: { rating: true },
    })

    const totalBoosterRating = boosterReviews.reduce((sum, r) => sum + r.rating, 0)
    const avgBoosterRating = boosterReviews.length > 0 ? totalBoosterRating / boosterReviews.length : 0

    await db.user.update({
      where: { id: targetId },
      data: {
        rating: Math.round(avgBoosterRating * 10) / 10,
        reviewsCount: boosterReviews.length,
      },
    })

    return NextResponse.json({ review }, { status: 201 })
  } catch (error) {
    console.error('Reviews POST error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
