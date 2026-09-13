import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'
import { markOrderPaid } from '@/lib/orders'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    const { status } = await request.json()

    if (status === 'paid') {
      const order = await markOrderPaid(id, 'manual')
      return ok({ order })
    }
    if (status === 'cancelled' || status === 'pending') {
      const order = await db.order.update({ where: { id }, data: { status } })
      return ok({ order })
    }
    return fail('Некорректный статус')
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    await db.order.delete({ where: { id } })
    return ok({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
