import { db } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const setup = await db.setup.findUnique({ where: { id }, include: { track: true } })
    if (!setup) return fail('Сетап не найден', 404)

    const owned =
      user?.role === 'admin' ||
      (user
        ? Boolean(
            await db.order.findFirst({
              where: { userId: user.id, setupId: setup.id, status: 'paid' },
            })
          )
        : false)

    return ok({ setup: { ...setup, data: owned ? setup.data : null, owned } })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    for (const key of ['title', 'type', 'pack', 'description', 'trackId'] as const) {
      if (body[key] !== undefined) data[key] = String(body[key])
    }
    if (body.price !== undefined) data.price = Number(body.price)
    if (body.oldPrice !== undefined) data.oldPrice = body.oldPrice === null ? null : Number(body.oldPrice)
    if (body.featured !== undefined) data.featured = Boolean(body.featured)
    if (body.active !== undefined) data.active = Boolean(body.active)
    if (body.data !== undefined) data.data = JSON.stringify(body.data)
    if (body.previewData !== undefined) data.previewData = JSON.stringify(body.previewData)

    const setup = await db.setup.update({ where: { id }, data, include: { track: true } })
    return ok({ setup })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    await db.setup.delete({ where: { id } })
    return ok({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
