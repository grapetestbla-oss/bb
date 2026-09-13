import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const plans = await db.trainingPlan.findMany({ orderBy: [{ order: 'asc' }, { price: 'asc' }] })
    return ok({ plans })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    if (!body.title) return fail('Укажите название программы')
    const plan = await db.trainingPlan.create({
      data: {
        title: String(body.title),
        description: String(body.description || ''),
        price: Number(body.price || 0),
        duration: String(body.duration || '60 минут'),
        features: JSON.stringify(body.features ?? []),
        order: Number(body.order || 0),
        active: body.active === undefined ? true : Boolean(body.active),
      },
    })
    return ok({ plan })
  } catch (error) {
    return handleError(error)
  }
}
