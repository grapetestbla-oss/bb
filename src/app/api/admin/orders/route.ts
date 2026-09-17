import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const status = new URL(request.url).searchParams.get('status')
    const orders = await db.order.findMany({
      where: status ? { status } : {},
      include: {
        user: true,
        setup: { include: { track: true, pilot: true } },
        packSet: { include: { pilot: true } },
        plan: true,
        training: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return ok({ orders })
  } catch (error) {
    return handleError(error)
  }
}
