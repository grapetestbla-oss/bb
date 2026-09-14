import { getCurrentSeason, getSeasonStandings } from '@/lib/standings'
import { SEASON_STATUS } from '@/lib/format'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { StandingsTables } from '@/components/standings-tables'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Таблица зачёта' }

export default async function StandingsPage() {
  const season = await getCurrentSeason()
  const standings = season ? await getSeasonStandings(season.id) : null

  return (
    <div>
      <PageHeader
        eyebrow={season?.name ?? 'Сезон не создан'}
        title="Таблица зачёта"
        subtitle="Личный зачёт пилотов и командный зачёт. Очки начисляются по итогам каждого этапа с учётом штрафов и бонусов."
      >
        {season && (
          <div className="flex gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary">
              {SEASON_STATUS[season.status] ?? season.status}
            </Badge>
            <Badge variant="secondary">{standings?.racesTotal ?? 0} этапов</Badge>
          </div>
        )}
      </PageHeader>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {standings ? (
          <StandingsTables drivers={standings.drivers} teams={standings.teams} />
        ) : (
          <EmptyState title="Сезон ещё не создан" description="Как только администрация откроет сезон, здесь появится таблица зачёта." />
        )}
      </div>
    </div>
  )
}
