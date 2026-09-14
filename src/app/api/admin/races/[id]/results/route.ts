import { db } from '@/lib/db'
import { guardAdmin, fail, ok } from '@/lib/api'
import { computeRacePoints } from '@/lib/standings'

type Ctx = { params: Promise<{ id: string }> }

type IncomingResult = {
  entryId: string
  position?: number | string | null
  fastestLap?: boolean
  pole?: boolean
  dnf?: boolean
  penalty?: number | string
  points?: number | string | null
  note?: string
}

export async function GET(_request: Request, { params }: Ctx) {
  const { response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  const results = await db.raceResult.findMany({ where: { raceId: id } })
  return ok({ results })
}

/** Полная перезапись протокола этапа. */
export async function PUT(request: Request, { params }: Ctx) {
  const { response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  const body = await request.json().catch(() => null)
  const incoming: IncomingResult[] = Array.isArray(body?.results) ? body.results : []

  const race = await db.race.findUnique({ where: { id }, include: { season: true } })
  if (!race) return fail('Этап не найден', 404)

  const entries = await db.seasonEntry.findMany({ where: { seasonId: race.seasonId } })
  const valid = new Set(entries.map((e) => e.id))

  const rows = incoming
    .filter((r) => valid.has(String(r.entryId)))
    .map((r) => {
      const position = r.position === '' || r.position === null || r.position === undefined
        ? null
        : Math.floor(Number(r.position)) || null
      const penalty = Math.round(Number(r.penalty ?? 0)) || 0
      const manual = r.points === '' || r.points === null || r.points === undefined ? null : Number(r.points)
      const auto = computeRacePoints(
        { position, fastestLap: !!r.fastestLap, pole: !!r.pole, dnf: !!r.dnf, penalty },
        race.season,
      )
      return {
        raceId: id,
        entryId: String(r.entryId),
        position,
        points: manual !== null && Number.isFinite(manual) ? manual : auto,
        fastestLap: !!r.fastestLap,
        pole: !!r.pole,
        dnf: !!r.dnf,
        penalty,
        note: typeof r.note === 'string' && r.note.trim() ? r.note.trim() : null,
      }
    })

  await db.$transaction([
    db.raceResult.deleteMany({ where: { raceId: id } }),
    ...(rows.length ? [db.raceResult.createMany({ data: rows })] : []),
    db.race.update({
      where: { id },
      data: { status: rows.length ? (body?.status ? String(body.status) : 'COMPLETED') : race.status },
    }),
  ])

  const results = await db.raceResult.findMany({ where: { raceId: id } })
  return ok({ results })
}
