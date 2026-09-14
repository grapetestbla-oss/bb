import { db } from '@/lib/db'
import { guardAdmin, ok } from '@/lib/api'
import { getSeasonStandings } from '@/lib/standings'

export async function GET(request: Request) {
  const { response } = await guardAdmin()
  if (response) return response

  const url = new URL(request.url)
  const requested = url.searchParams.get('seasonId')

  const seasons = await db.season.findMany({ orderBy: { createdAt: 'desc' } })
  const season =
    seasons.find((s) => s.id === requested) ?? seasons.find((s) => s.isCurrent) ?? seasons[0] ?? null

  const [applications, news, users] = await Promise.all([
    db.application.findMany({
      include: {
        user: { select: { id: true, username: true, displayName: true, email: true, avatar: true } },
        season: { select: { id: true, name: true } },
        reviewer: { select: { username: true, displayName: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    }),
    db.news.findMany({ orderBy: { createdAt: 'desc' } }),
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, username: true, displayName: true, email: true, role: true,
        blocked: true, avatar: true, gameNick: true, platform: true, createdAt: true,
      },
    }),
  ])

  if (!season) {
    return ok({ seasons, season: null, teams: [], entries: [], races: [], standings: null, applications, news, users })
  }

  const [teams, entries, races, standings] = await Promise.all([
    db.team.findMany({ where: { seasonId: season.id }, orderBy: { order: 'asc' } }),
    db.seasonEntry.findMany({
      where: { seasonId: season.id },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatar: true } },
        team: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    db.race.findMany({
      where: { seasonId: season.id },
      include: { results: true },
      orderBy: { round: 'asc' },
    }),
    getSeasonStandings(season.id),
  ])

  return ok({ seasons, season, teams, entries, races, standings, applications, news, users })
}
