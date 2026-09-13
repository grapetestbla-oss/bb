import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await requireAdmin()
    const status = new URL(request.url).searchParams.get('status')
    const requests = await db.trainingRequest.findMany({
      where: status ? { status } : {},
      include: { user: true, takenBy: true, order: { include: { plan: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ requests })
  } catch (error) {
    return handleError(error)
  }
}
