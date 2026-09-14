import { db } from '@/lib/db'
import { guardAdmin, fail, ok, slugify } from '@/lib/api'

export async function POST(request: Request) {
  const { response } = await guardAdmin()
  if (response) return response

  const body = await request.json().catch(() => null)
  const name = String(body?.name ?? '').trim()
  if (!name) return fail('Укажите название сезона')

  let slug = slugify(name)
  if (await db.season.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`

  const makeCurrent = body?.isCurrent !== false
  if (makeCurrent) await db.season.updateMany({ data: { isCurrent: false } })

  const season = await db.season.create({
    data: {
      name,
      slug,
      status: String(body?.status ?? 'UPCOMING'),
      isCurrent: makeCurrent,
      description: String(body?.description ?? '').trim() || null,
      rules: String(body?.rules ?? '').trim() || null,
      pointsSystem: typeof body?.pointsSystem === 'string' && body.pointsSystem.trim()
        ? body.pointsSystem.trim()
        : '[25,18,15,12,10,8,6,4,2,1]',
      fastestLapPoint: Number(body?.fastestLapPoint ?? 1) || 0,
      polePoint: Number(body?.polePoint ?? 0) || 0,
      applicationsOpen: body?.applicationsOpen !== false,
      startDate: body?.startDate ? new Date(body.startDate) : null,
    },
  })

  return ok({ season }, 201)
}
