import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const pack = new URL(request.url).searchParams.get('pack')
    const tracks = await db.track.findMany({
      where: { active: true, ...(pack ? { pack } : {}) },
      orderBy: [{ pack: 'asc' }, { round: 'asc' }],
      include: { _count: { select: { setups: true } } },
    })
    return ok({ tracks })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()
    if (!body.name || !body.slug) return fail('Укажите название и slug трассы')
    const track = await db.track.create({
      data: {
        slug: String(body.slug),
        name: String(body.name),
        country: String(body.country || ''),
        flag: String(body.flag || '🏁'),
        pack: String(body.pack || 'f125'),
        round: Number(body.round || 0),
        laps: Number(body.laps || 0),
        lengthKm: Number(body.lengthKm || 0),
      },
    })
    return ok({ track })
  } catch (error) {
    return handleError(error)
  }
}
