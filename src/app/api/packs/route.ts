import { db } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const user = await getCurrentUser()
    const isAdmin = user?.role === 'admin'
    const game = params.get('game')
    const pilot = params.get('pilot')

    const packs = await db.pack.findMany({
      where: {
        ...(isAdmin ? {} : { active: true }),
        ...(game ? { game } : {}),
        ...(pilot ? { pilot: { slug: pilot } } : {}),
      },
      include: {
        pilot: true,
        setups: { include: { setup: { include: { track: true } } } },
      },
      orderBy: [{ featured: 'desc' }, { order: 'asc' }, { price: 'asc' }],
    })

    const owned = user
      ? new Set(
          (
            await db.order.findMany({
              where: { userId: user.id, status: 'paid', packId: { not: null } },
              select: { packId: true },
            })
          ).map((o) => o.packId as string)
        )
      : new Set<string>()

    return ok({
      packs: packs.map((pack) => ({
        ...pack,
        tracksCount: pack.setups.length,
        owned: isAdmin || owned.has(pack.id),
      })),
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    if (!body.title || !body.slug || !body.pilotId) {
      return fail('Укажите название, slug и пилота')
    }

    const setupIds: string[] = Array.isArray(body.setupIds) ? body.setupIds.map(String) : []

    const pack = await db.pack.create({
      data: {
        slug: String(body.slug),
        title: String(body.title),
        description: String(body.description || ''),
        pilotId: String(body.pilotId),
        game: String(body.game || 'f125'),
        price: Number(body.price || 0),
        oldPrice: body.oldPrice ? Number(body.oldPrice) : null,
        featured: Boolean(body.featured),
        order: Number(body.order || 0),
        active: body.active === undefined ? true : Boolean(body.active),
        setups: { create: setupIds.map((setupId) => ({ setupId })) },
      },
      include: { pilot: true, setups: true },
    })
    return ok({ pack })
  } catch (error) {
    return handleError(error)
  }
}
