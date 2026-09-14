import { db } from '@/lib/db'
import { guardAdmin, fail, ok } from '@/lib/api'

export async function POST(request: Request) {
  const { response } = await guardAdmin()
  if (response) return response

  const body = await request.json().catch(() => null)
  const seasonId = String(body?.seasonId ?? '')
  const name = String(body?.name ?? '').trim()
  const track = String(body?.track ?? '').trim()
  if (!seasonId) return fail('Не выбран сезон')
  if (!name) return fail('Укажите название этапа')
  if (!body?.date) return fail('Укажите дату проведения')

  const last = await db.race.findFirst({ where: { seasonId }, orderBy: { round: 'desc' } })
  const requestedRound = Number(body?.round)
  const round = Number.isFinite(requestedRound) && requestedRound > 0
    ? Math.floor(requestedRound)
    : (last?.round ?? 0) + 1

  const clash = await db.race.findFirst({ where: { seasonId, round } })
  if (clash) return fail(`Этап №${round} уже существует в этом сезоне`, 409)

  const laps = Number(body?.laps)
  const race = await db.race.create({
    data: {
      seasonId,
      round,
      name,
      track: track || name,
      country: String(body?.country ?? '').trim() || null,
      flag: String(body?.flag ?? '').trim() || null,
      date: new Date(body.date),
      laps: Number.isFinite(laps) && laps > 0 ? Math.floor(laps) : null,
      status: String(body?.status ?? 'SCHEDULED'),
      broadcastUrl: String(body?.broadcastUrl ?? '').trim() || null,
      notes: String(body?.notes ?? '').trim() || null,
    },
  })
  return ok({ race }, 201)
}
