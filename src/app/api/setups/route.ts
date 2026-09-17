import { db } from '@/lib/db'
import { getCurrentUser, requireAdmin } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'
import { getOwnedSetupIds } from '@/lib/ownership'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const user = await getCurrentUser()
    const isAdmin = user?.role === 'admin'

    const trackSlug = params.get('track')
    const pack = params.get('pack')
    const pilot = params.get('pilot')
    const search = params.get('search')
    const featured = params.get('featured')

    const setups = await db.setup.findMany({
      where: {
        ...(isAdmin ? {} : { active: true }),
        ...(pack ? { pack } : {}),
        ...(featured === 'true' ? { featured: true } : {}),
        ...(trackSlug ? { track: { slug: trackSlug } } : {}),
        ...(pilot ? { pilot: { slug: pilot } } : {}),
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
      include: { track: true, pilot: true, variants: { orderBy: { order: 'asc' } } },
      orderBy: [{ featured: 'desc' }, { track: { round: 'asc' } }],
    })

    const owned = await getOwnedSetupIds(user?.id)

    return ok({
      setups: setups.map((setup) => {
        const isOwned = isAdmin || owned.has(setup.id)
        return {
          ...setup,
          owned: isOwned,
          // значения вариантов скрыты до покупки
          variants: setup.variants.map((variant) => ({
            ...variant,
            data: isOwned ? variant.data : null,
          })),
        }
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
    if (!body.trackId || !body.pilotId || !body.title) {
      return fail('Укажите трассу, пилота и название сетапа')
    }

    const variants: { condition: string; title?: string; notes?: string; data?: unknown }[] =
      Array.isArray(body.variants) ? body.variants : []

    const setup = await db.setup.create({
      data: {
        trackId: String(body.trackId),
        pilotId: String(body.pilotId),
        title: String(body.title),
        pack: String(body.pack || 'f125'),
        price: Number(body.price || 0),
        oldPrice: body.oldPrice ? Number(body.oldPrice) : null,
        description: String(body.description || ''),
        previewData: JSON.stringify(body.previewData ?? {}),
        featured: Boolean(body.featured),
        active: body.active === undefined ? true : Boolean(body.active),
        variants: {
          create: variants.map((variant, index) => ({
            condition: String(variant.condition || 'dry'),
            title: String(variant.title || ''),
            notes: String(variant.notes || ''),
            data: JSON.stringify(variant.data ?? {}),
            order: index,
          })),
        },
      },
      include: { track: true, pilot: true, variants: true },
    })
    return ok({ setup })
  } catch (error) {
    return handleError(error)
  }
}
