import { db } from '@/lib/db'
import { getCurrentSeason, getSeasonStandings } from '@/lib/standings'
import { ENTRY_STATUS } from '@/lib/format'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Команды и пилоты' }

export default async function TeamsPage() {
  const season = await getCurrentSeason()
  if (!season) {
    return (
      <div>
        <PageHeader title="Команды и пилоты" subtitle="Составы команд текущего сезона." />
        <div className="mx-auto max-w-7xl px-4 py-10">
          <EmptyState title="Сезон ещё не создан" />
        </div>
      </div>
    )
  }

  const [teams, freeAgents, standings] = await Promise.all([
    db.team.findMany({
      where: { seasonId: season.id },
      orderBy: { order: 'asc' },
      include: { entries: { include: { user: true } } },
    }),
    db.seasonEntry.findMany({
      where: { seasonId: season.id, teamId: null },
      include: { user: true },
    }),
    getSeasonStandings(season.id),
  ])

  const pointsByEntry = new Map(standings.drivers.map((d) => [d.entryId, d.points]))
  const teamPoints = new Map(standings.teams.map((t) => [t.teamId, t.points]))

  return (
    <div>
      <PageHeader
        eyebrow={season.name}
        title="Команды и пилоты"
        subtitle="Составы, номера пилотов и набранные очки в текущем сезоне."
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        {teams.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <div key={team.id} className="surface overflow-hidden">
                <div className="h-1.5 w-full" style={{ background: team.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">{team.name}</h2>
                      {team.shortName && (
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">{team.shortName}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black tabular-nums text-primary">{teamPoints.get(team.id) ?? 0}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">очков</div>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {team.entries.length ? (
                      team.entries.map((entry) => (
                        <li key={entry.id} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                          <div>
                            <div className="text-sm font-semibold">
                              {entry.user.displayName}
                              {entry.number ? <span className="ml-1.5 text-xs text-muted-foreground">#{entry.number}</span> : null}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {ENTRY_STATUS[entry.status] ?? entry.status}
                            </div>
                          </div>
                          <span className="text-sm font-bold tabular-nums">{pointsByEntry.get(entry.id) ?? 0}</span>
                        </li>
                      ))
                    ) : (
                      <li className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                        Состав ещё не сформирован
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Команд пока нет" description="Администрация ещё не создала команды сезона." />
        )}

        {freeAgents.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 text-lg font-bold">Пилоты без команды</h2>
            <div className="flex flex-wrap gap-2">
              {freeAgents.map((entry) => (
                <Badge key={entry.id} variant="secondary" className="px-3 py-1.5 text-sm">
                  {entry.user.displayName}
                  {entry.number ? ` #${entry.number}` : ''}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
