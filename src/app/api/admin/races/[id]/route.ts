import { db } from '@/lib/db'
import { guardAdmin, fail, ok } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return fail('Некорректный запрос')

  const race = await db.race.findUnique({ where: { id } })
  if (!race) return fail('Этап не найден', 404)

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.track === 'string' && body.track.trim()) data.track = body.track.trim()
  if (typeof body.country === 'string') data.country = body.country.trim() || null
  if (typeof body.flag === 'string') data.flag = body.flag.trim() || null
  if (body.date) data.date = new Date(body.date)
  if (body.laps !== undefined) {
    const laps = Number(body.laps)
    data.laps = Number.isFinite(laps) && laps > 0 ? Math.floor(laps) : null
  }
  if (typeof body.status === 'string') data.status = body.status
  if (typeof body.broadcastUrl === 'string') data.broadcastUrl = body.broadcastUrl.trim() || null
  if (typeof body.notes === 'string') data.notes = body.notes.trim() || null
  if (body.round !== undefined) {
    const round = Math.floor(Number(body.round) || 0)
    if (round > 0 && round !== race.round) {
      const clash = await db.race.findFirst({ where: { seasonId: race.seasonId, round } })
      if (clash) return fail(`Этап №${round} уже существует`, 409)
      data.round = round
    }
  }

  const updated = await db.race.update({ where: { id }, data })
  return ok({ race: updated })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  await db.race.delete({ where: { id } })
  return ok({ success: true })
}
