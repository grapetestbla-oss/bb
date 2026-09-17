import { db } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'
import { ownsSetup } from '@/lib/ownership'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const setup = await db.setup.findUnique({
      where: { id },
      include: { track: true, pilot: true, variants: { orderBy: { order: 'asc' } } },
    })
    if (!setup) return fail('Сетап не найден', 404)

    const owned = user?.role === 'admin' || (await ownsSetup(user?.id, setup.id))

    return ok({
      setup: {
        ...setup,
        owned,
        variants: setup.variants.map((variant) => ({
          ...variant,
          data: owned ? variant.data : null,
        })),
      },
    })
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
    for (const key of ['title', 'pack', 'description', 'trackId', 'pilotId'] as const) {
      if (body[key] !== undefined) data[key] = String(body[key])
    }
    if (body.price !== undefined) data.price = Number(body.price)
    if (body.oldPrice !== undefined) data.oldPrice = body.oldPrice === null ? null : Number(body.oldPrice)
    if (body.featured !== undefined) data.featured = Boolean(body.featured)
    if (body.active !== undefined) data.active = Boolean(body.active)
    if (body.previewData !== undefined) data.previewData = JSON.stringify(body.previewData)

    if (Array.isArray(body.variants)) {
      await db.setupVariant.deleteMany({ where: { setupId: id } })
      data.variants = {
        create: body.variants.map(
          (
            variant: { condition?: string; title?: string; notes?: string; data?: unknown },
            index: number
          ) => ({
            condition: String(variant.condition || 'dry'),
            title: String(variant.title || ''),
            notes: String(variant.notes || ''),
            data: JSON.stringify(variant.data ?? {}),
            order: index,
          })
        ),
      }
    }

    const setup = await db.setup.update({
      where: { id },
      data,
      include: { track: true, pilot: true, variants: { orderBy: { order: 'asc' } } },
    })
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
