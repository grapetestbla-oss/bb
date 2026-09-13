import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    const [users, setups, tracks, paidOrders, pendingOrders, newTrainings, revenue] = await Promise.all([
      db.user.count(),
      db.setup.count(),
      db.track.count(),
      db.order.count({ where: { status: 'paid' } }),
      db.order.count({ where: { status: 'pending' } }),
      db.trainingRequest.count({ where: { status: 'new' } }),
      db.order.aggregate({ _sum: { amount: true }, where: { status: 'paid' } }),
    ])

    const recent = await db.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { user: true, setup: { include: { track: true } }, plan: true },
    })

    return ok({
      stats: {
        users,
        setups,
        tracks,
        paidOrders,
        pendingOrders,
        newTrainings,
        revenue: revenue._sum.amount || 0,
      },
      recent,
    })
  } catch (error) {
    return handleError(error)
  }
}
