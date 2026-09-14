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
  if (typeof body.status === 'string') data.status = body.status
  if (typeof body.description === 'string') data.description = body.description.trim() || null
  if (typeof body.rules === 'string') data.rules = body.rules.trim() || null
  if (typeof body.pointsSystem === 'string' && body.pointsSystem.trim()) data.pointsSystem = body.pointsSystem.trim()
  if (body.fastestLapPoint !== undefined) data.fastestLapPoint = Number(body.fastestLapPoint) || 0
  if (body.polePoint !== undefined) data.polePoint = Number(body.polePoint) || 0
  if (typeof body.applicationsOpen === 'boolean') data.applicationsOpen = body.applicationsOpen
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null

  if (body.isCurrent === true) {
    await db.season.updateMany({ data: { isCurrent: false } })
    data.isCurrent = true
  } else if (body.isCurrent === false) {
    data.isCurrent = false
  }

  const season = await db.season.update({ where: { id }, data })
  return ok({ season })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  await db.season.delete({ where: { id } })
  return ok({ success: true })
}
