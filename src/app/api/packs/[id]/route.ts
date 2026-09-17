import { db } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'
import { ownsPack } from '@/lib/ownership'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const pack = await db.pack.findUnique({
      where: { id },
      include: { pilot: true, setups: { include: { setup: { include: { track: true } } } } },
    })
    if (!pack) return fail('Пак не найден', 404)
    const owned = user?.role === 'admin' || (await ownsPack(user?.id, pack.id))
    return ok({ pack: { ...pack, owned } })
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
    for (const key of ['slug', 'title', 'description', 'game', 'pilotId'] as const) {
      if (body[key] !== undefined) data[key] = String(body[key])
    }
    if (body.price !== undefined) data.price = Number(body.price)
    if (body.oldPrice !== undefined) data.oldPrice = body.oldPrice === null ? null : Number(body.oldPrice)
    if (body.featured !== undefined) data.featured = Boolean(body.featured)
    if (body.order !== undefined) data.order = Number(body.order)
    if (body.active !== undefined) data.active = Boolean(body.active)

    if (Array.isArray(body.setupIds)) {
      await db.packSetup.deleteMany({ where: { packId: id } })
      data.setups = { create: body.setupIds.map((setupId: string) => ({ setupId: String(setupId) })) }
    }

    const pack = await db.pack.update({
      where: { id },
      data,
      include: { pilot: true, setups: { include: { setup: { include: { track: true } } } } },
    })
    return ok({ pack })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    await db.pack.delete({ where: { id } })
    return ok({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
