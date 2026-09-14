import { db } from '@/lib/db'
import { guardAdmin, fail, ok } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return fail('Некорректный запрос')

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.shortName === 'string') data.shortName = body.shortName.trim() || null
  if (typeof body.color === 'string') data.color = body.color
  if (typeof body.logo === 'string') data.logo = body.logo.trim() || null
  if (body.pointsAdjust !== undefined) data.pointsAdjust = Math.round(Number(body.pointsAdjust) || 0)
  if (body.order !== undefined) data.order = Math.round(Number(body.order) || 0)

  const team = await db.team.update({ where: { id }, data })
  return ok({ team })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  await db.team.delete({ where: { id } })
  return ok({ success: true })
}
