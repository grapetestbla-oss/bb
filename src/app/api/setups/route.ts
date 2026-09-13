import { db } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const user = await getCurrentUser()
    const isAdmin = user?.role === 'admin'

    const trackSlug = params.get('track')
    const type = params.get('type')
    const pack = params.get('pack')
    const search = params.get('search')
    const featured = params.get('featured')

    const setups = await db.setup.findMany({
      where: {
        ...(isAdmin ? {} : { active: true }),
        ...(type ? { type } : {}),
        ...(pack ? { pack } : {}),
        ...(featured === 'true' ? { featured: true } : {}),
        ...(trackSlug ? { track: { slug: trackSlug } } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { description: { contains: search } },
                { track: { name: { contains: search } } },
              ],
            }
          : {}),
      },
      include: { track: true },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    })

    // содержимое сетапа не отдаём без покупки
    const paidSetupIds = user
      ? (
          await db.order.findMany({
            where: { userId: user.id, status: 'paid', setupId: { not: null } },
            select: { setupId: true },
          })
        ).map((o) => o.setupId)
      : []

    return ok({
      setups: setups.map((setup) => {
        const owned = isAdmin || paidSetupIds.includes(setup.id)
        return { ...setup, data: owned ? setup.data : null, owned }
      }),
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    if (!body.trackId || !body.title) return fail('Укажите трассу и название сетапа')

    const setup = await db.setup.create({
      data: {
        trackId: String(body.trackId),
        title: String(body.title),
        type: String(body.type || 'race'),
        pack: String(body.pack || 'f125'),
        price: Number(body.price || 0),
        oldPrice: body.oldPrice ? Number(body.oldPrice) : null,
        description: String(body.description || ''),
        data: JSON.stringify(body.data ?? {}),
        previewData: JSON.stringify(body.previewData ?? {}),
        featured: Boolean(body.featured),
        active: body.active === undefined ? true : Boolean(body.active),
      },
      include: { track: true },
    })
    return ok({ setup })
  } catch (error) {
    return handleError(error)
  }
}
