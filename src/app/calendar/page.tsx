import { db } from '@/lib/db'
import { getCurrentSeason } from '@/lib/standings'
import { formatDateTime, positionClass, relativeDays, RACE_STATUS } from '@/lib/format'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Календарь сезона' }

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  SCHEDULED: 'outline',
  LIVE: 'default',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
}

export default async function CalendarPage() {
  const season = await getCurrentSeason()
  const races = season
    ? await db.race.findMany({
        where: { seasonId: season.id },
        orderBy: { round: 'asc' },
        include: {
          results: {
            where: { position: { in: [1, 2, 3] } },
            include: { entry: { include: { user: true, team: true } } },
            orderBy: { position: 'asc' },
          },
        },
      })
    : []

  return (
    <div>
      <PageHeader
        eyebrow={season?.name ?? 'Сезон'}
        title="Календарь сезона"
        subtitle="Расписание этапов, время старта и результаты подиума прошедших гонок."
      >
        {season && <Badge variant="outline" className="border-primary/40 text-primary">{races.length} этапов</Badge>}
      </PageHeader>

      <div className="mx-auto max-w-5xl px-4 py-10">
        {races.length ? (
          <ol className="space-y-4">
            {races.map((race) => (
              <li key={race.id} className="surface overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 p-5">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/30 bg-primary/5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">этап</span>
                    <span className="text-xl font-black leading-none text-primary">{race.round}</span>
                  </div>

                  <div className="min-w-[200px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold">{race.name}</h2>
                      <Badge variant={statusVariant[race.status] ?? 'outline'}>
                        {RACE_STATUS[race.status] ?? race.status}
                      </Badge>
                      {race.status === 'SCHEDULED' && relativeDays(race.date) && (
                        <span className="text-xs text-muted-foreground">{relativeDays(race.date)}</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {race.flag && <span className="mr-1">{race.flag}</span>}
                      {race.track}
                      {race.country ? `, ${race.country}` : ''}
                      {race.laps ? ` · ${race.laps} кругов` : ''}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">{formatDateTime(race.date)}</div>
                    {race.broadcastUrl && (
                      <a
                        href={race.broadcastUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Трансляция
                      </a>
                    )}
                  </div>
                </div>

                {race.results.length > 0 && (
                  <div className="flex flex-wrap gap-3 border-t border-border bg-muted/20 px-5 py-3">
                    {race.results.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-sm">
                        <span className={positionClass(r.position ?? 0)}>{r.position}</span>
                        <span className="font-medium">{r.entry.user.displayName}</span>
                        {r.entry.team && (
                          <span className="text-xs text-muted-foreground">{r.entry.team.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {race.notes && (
                  <div className="border-t border-border px-5 py-3 text-sm text-muted-foreground">{race.notes}</div>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="Календарь пока пуст"
            description="Администрация ещё не добавила этапы текущего сезона."
          />
        )}
      </div>
    </div>
  )
}
