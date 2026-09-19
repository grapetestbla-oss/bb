import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    const users = await db.user.findMany({
      where: { hidden: false }, // скрытые служебные аккаунты не показываем
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        login: true,
        email: true,
        role: true,
        contact: true,
        createdAt: true,
        _count: { select: { orders: true, trainingRequests: true } },
      },
    })
    return ok({ users })
  } catch (error) {
    return handleError(error)
  }
}
