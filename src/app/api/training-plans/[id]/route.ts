import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const data: Record<string, unknown> = {}
    for (const key of ['title', 'description', 'duration'] as const) {
      if (body[key] !== undefined) data[key] = String(body[key])
    }
    if (body.price !== undefined) data.price = Number(body.price)
    if (body.order !== undefined) data.order = Number(body.order)
    if (body.active !== undefined) data.active = Boolean(body.active)
    if (body.features !== undefined) data.features = JSON.stringify(body.features)
    const plan = await db.trainingPlan.update({ where: { id }, data })
    return ok({ plan })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    await db.trainingPlan.delete({ where: { id } })
    return ok({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
