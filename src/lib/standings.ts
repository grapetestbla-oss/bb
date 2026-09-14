import { db } from '@/lib/db'
import { parsePointsSystem, computeRacePoints } from '@/lib/points'

export { parsePointsSystem, computeRacePoints }

export type DriverStanding = {
  entryId: string
  userId: string
  position: number
  driver: string
  username: string
  avatar: string | null
  number: number | null
  status: string
  teamId: string | null
  teamName: string | null
  teamColor: string | null
  points: number
  adjust: number
  wins: number
  podiums: number
  poles: number
  fastestLaps: number
  starts: number
  dnf: number
  bestFinish: number | null
}

export type TeamStanding = {
  teamId: string
  position: number
  name: string
  color: string
  logo: string | null
  points: number
  adjust: number
  wins: number
  podiums: number
  drivers: { entryId: string; name: string; points: number }[]
}

export async function getSeasonStandings(seasonId: string) {
  const [entries, races] = await Promise.all([
    db.seasonEntry.findMany({
      where: { seasonId },
      include: { user: true, team: true, results: true },
    }),
    db.race.findMany({ where: { seasonId }, orderBy: { round: 'asc' } }),
  ])

  const drivers: DriverStanding[] = entries.map((entry) => {
    const results = entry.results
    const racePoints = results.reduce((sum, r) => sum + (r.points ?? 0), 0)
    const finishes = results
      .filter((r) => !r.dnf && typeof r.position === 'number' && r.position! > 0)
      .map((r) => r.position as number)

    return {
      entryId: entry.id,
      userId: entry.userId,
      position: 0,
      driver: entry.user.displayName || entry.user.username,
      username: entry.user.username,
      avatar: entry.user.avatar,
      number: entry.number,
      status: entry.status,
      teamId: entry.teamId,
      teamName: entry.team?.name ?? null,
      teamColor: entry.team?.color ?? null,
      points: racePoints + entry.pointsAdjust,
      adjust: entry.pointsAdjust,
      wins: finishes.filter((p) => p === 1).length,
      podiums: finishes.filter((p) => p <= 3).length,
      poles: results.filter((r) => r.pole).length,
      fastestLaps: results.filter((r) => r.fastestLap).length,
      starts: results.length,
      dnf: results.filter((r) => r.dnf).length,
      bestFinish: finishes.length ? Math.min(...finishes) : null,
    }
  })

  drivers.sort(
    (a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      b.podiums - a.podiums ||
      (a.bestFinish ?? 99) - (b.bestFinish ?? 99) ||
      a.driver.localeCompare(b.driver),
  )
  drivers.forEach((d, i) => (d.position = i + 1))

  const teams = await db.team.findMany({ where: { seasonId }, orderBy: { order: 'asc' } })
  const teamStandings: TeamStanding[] = teams.map((team) => {
    const teamDrivers = drivers.filter((d) => d.teamId === team.id)
    return {
      teamId: team.id,
      position: 0,
      name: team.name,
      color: team.color,
      logo: team.logo,
      points: teamDrivers.reduce((s, d) => s + d.points, 0) + team.pointsAdjust,
      adjust: team.pointsAdjust,
      wins: teamDrivers.reduce((s, d) => s + d.wins, 0),
      podiums: teamDrivers.reduce((s, d) => s + d.podiums, 0),
      drivers: teamDrivers.map((d) => ({ entryId: d.entryId, name: d.driver, points: d.points })),
    }
  })

  teamStandings.sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name))
  teamStandings.forEach((t, i) => (t.position = i + 1))

  return { drivers, teams: teamStandings, racesTotal: races.length }
}

export async function getCurrentSeason() {
  return (
    (await db.season.findFirst({ where: { isCurrent: true } })) ??
    (await db.season.findFirst({ orderBy: { createdAt: 'desc' } }))
  )
}
