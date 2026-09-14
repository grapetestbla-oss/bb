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
  if (body.teamId !== undefined) data.teamId = body.teamId ? String(body.teamId) : null
  if (body.number !== undefined) {
    const n = Number(body.number)
    data.number = Number.isFinite(n) && n > 0 ? Math.floor(n) : null
  }
  if (typeof body.status === 'string') data.status = body.status
  if (body.pointsAdjust !== undefined) data.pointsAdjust = Math.round(Number(body.pointsAdjust) || 0)

  const entry = await db.seasonEntry.update({ where: { id }, data })
  return ok({ entry })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  await db.seasonEntry.delete({ where: { id } })
  return ok({ success: true })
}
