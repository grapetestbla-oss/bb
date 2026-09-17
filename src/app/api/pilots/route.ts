import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const pilots = await db.pilot.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { setups: true, packs: true } } },
    })
    return ok({ pilots })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    if (!body.name || !body.slug) return fail('Укажите имя и slug пилота')

    const pilot = await db.pilot.create({
      data: {
        slug: String(body.slug),
        name: String(body.name),
        title: String(body.title || ''),
        bio: String(body.bio || ''),
        contact: body.contact ? String(body.contact) : null,
        order: Number(body.order || 0),
        active: body.active === undefined ? true : Boolean(body.active),
      },
    })
    return ok({ pilot })
  } catch (error) {
    return handleError(error)
  }
}
