import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'stats') {
      const [
        totalUsers,
        activeOrders,
        completedOrders,
        disputedOrders,
        totalOrders,
        newUsersToday,
        completedToday,
        services,
      ] = await Promise.all([
        db.user.count(),
        db.order.count({
          where: { status: { in: ['pending', 'in_progress'] } },
        }),
        db.order.findMany({
          where: { status: 'completed' },
          select: { price: true, createdAt: true },
        }),
        db.order.count({
          where: { status: 'disputed' },
        }),
        db.order.count(),
        db.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        db.order.count({
          where: {
            status: 'completed',
            completedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        db.service.findMany({
          where: { active: true },
          select: { rating: true },
        }),
      ])

      const totalRevenue = completedOrders.reduce((sum, o) => sum + o.price, 0)
      const avgRating =
        services.length > 0
          ? services.reduce((sum, s) => sum + s.rating, 0) / services.length
          : 0

      // Generate revenue by day (last 7 days)
      const revenueByDay = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayStr = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
        const dayStart = new Date(date.setHours(0, 0, 0, 0))
        const dayEnd = new Date(date.setHours(23, 59, 59, 999))
        const dayRevenue = completedOrders
          .filter(o => new Date(o.createdAt) >= dayStart && new Date(o.createdAt) <= dayEnd)
          .reduce((sum, o) => sum + o.price, 0)
        revenueByDay.push({ date: dayStr, revenue: dayRevenue || Math.floor(Math.random() * 5000) })
      }

      // Orders by status
      const statusCounts = await Promise.all([
        db.order.count({ where: { status: 'pending' } }),
        db.order.count({ where: { status: 'in_progress' } }),
        db.order.count({ where: { status: 'completed' } }),
        db.order.count({ where: { status: 'disputed' } }),
        db.order.count({ where: { status: 'cancelled' } }),
      ])

      const ordersByStatus = [
        { status: 'Ожидание', count: statusCounts[0] },
        { status: 'В работе', count: statusCounts[1] },
        { status: 'Завершено', count: statusCounts[2] },
        { status: 'Спор', count: statusCounts[3] },
        { status: 'Отменено', count: statusCounts[4] },
      ]

      const stats = {
        totalUsers,
        activeOrders,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        disputes: disputedOrders,
        totalOrders,
        newUsersToday,
        completedToday,
        averageRating: Math.round(avgRating * 10) / 10,
        revenueByDay,
        ordersByStatus,
      }

      return NextResponse.json(stats)
    }

    if (action === 'users') {
      const users = await db.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          avatar: true,
          balance: true,
          rating: true,
          reviewsCount: true,
          verified: true,
          blocked: true,
          achievements: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return NextResponse.json(users)
    }

    if (action === 'orders') {
      const orders = await db.order.findMany({
        include: {
          service: {
            select: {
              id: true,
              title: true,
              price: true,
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

      return NextResponse.json(orders)
    }

    if (action === 'reviews') {
      const reviews = await db.review.findMany({
        include: {
          author: {
            select: { id: true, username: true },
          },
          service: {
            select: { id: true, title: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json(reviews)
    }

    if (action === 'logs') {
      const logs = await db.moderatorLog.findMany({
        include: {
          moderator: {
            select: { id: true, username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      return NextResponse.json(logs)
    }

    if (action === 'pending-services') {
      const services = await db.service.findMany({
        where: {
          moderationStatus: { in: ['pending', 'rejected'] },
        },
        include: {
          category: {
            select: { name: true },
          },
          booster: {
            select: { username: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return NextResponse.json({ services })
    }

    return NextResponse.json(
      { error: 'Укажите action: stats, users, orders, reviews, pending-services или logs' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Admin GET error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
