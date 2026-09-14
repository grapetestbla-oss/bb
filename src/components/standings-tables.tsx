'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { positionClass } from '@/lib/format'
import type { DriverStanding, TeamStanding } from '@/lib/standings'

export function StandingsTables({
  drivers,
  teams,
}: {
  drivers: DriverStanding[]
  teams: TeamStanding[]
}) {
  return (
    <Tabs defaultValue="drivers" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="drivers">Личный зачёт</TabsTrigger>
        <TabsTrigger value="teams">Командный зачёт</TabsTrigger>
      </TabsList>

      <TabsContent value="drivers">
        <DriversTable drivers={drivers} />
      </TabsContent>

      <TabsContent value="teams">
        <TeamsTable teams={teams} />
      </TabsContent>
    </Tabs>
  )
}

export function DriversTable({ drivers, compact = false }: { drivers: DriverStanding[]; compact?: boolean }) {
  if (!drivers.length) {
    return <p className="surface p-8 text-center text-sm text-muted-foreground">Зачёт пока пуст — пилоты ещё не заявлены.</p>
  }

  return (
    <div className="surface overflow-x-auto">
      <table className={`w-full text-sm ${compact ? 'min-w-[380px]' : 'min-w-[640px]'}`}>
        <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-3 text-left">#</th>
            <th className="px-3 py-3 text-left">Пилот</th>
            <th className="px-3 py-3 text-left">Команда</th>
            {!compact && <th className="px-3 py-3 text-center">Гонки</th>}
            {!compact && <th className="px-3 py-3 text-center">Победы</th>}
            {!compact && <th className="px-3 py-3 text-center">Подиумы</th>}
            {!compact && <th className="px-3 py-3 text-center">Поулы</th>}
            {!compact && <th className="px-3 py-3 text-center">БК</th>}
            <th className="px-3 py-3 text-right">Очки</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.entryId} className="table-row-hover border-b border-border/60 last:border-0">
              <td className="px-3 py-3">
                <span className={positionClass(d.position)}>{d.position}</span>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{d.driver}</span>
                  {d.number && <span className="text-xs text-muted-foreground">#{d.number}</span>}
                  {d.status === 'RESERVE' && (
                    <Badge variant="outline" className="text-[10px]">резерв</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">@{d.username}</div>
              </td>
              <td className="px-3 py-3">
                {d.teamName ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-1 rounded-full" style={{ background: d.teamColor ?? '#666' }} />
                    {d.teamName}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              {!compact && <td className="px-3 py-3 text-center tabular-nums">{d.starts}</td>}
              {!compact && <td className="px-3 py-3 text-center tabular-nums">{d.wins}</td>}
              {!compact && <td className="px-3 py-3 text-center tabular-nums">{d.podiums}</td>}
              {!compact && <td className="px-3 py-3 text-center tabular-nums">{d.poles}</td>}
              {!compact && <td className="px-3 py-3 text-center tabular-nums">{d.fastestLaps}</td>}
              <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-primary">
                {d.points}
                {d.adjust !== 0 && (
                  <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                    ({d.adjust > 0 ? '+' : ''}{d.adjust})
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TeamsTable({ teams }: { teams: TeamStanding[] }) {
  if (!teams.length) {
    return <p className="surface p-8 text-center text-sm text-muted-foreground">Команды сезона ещё не созданы.</p>
  }

  return (
    <div className="surface overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-3 text-left">#</th>
            <th className="px-3 py-3 text-left">Команда</th>
            <th className="px-3 py-3 text-left">Состав</th>
            <th className="px-3 py-3 text-center">Победы</th>
            <th className="px-3 py-3 text-right">Очки</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.teamId} className="table-row-hover border-b border-border/60 last:border-0">
              <td className="px-3 py-3">
                <span className={positionClass(t.position)}>{t.position}</span>
              </td>
              <td className="px-3 py-3">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <span className="h-6 w-1.5 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </span>
              </td>
              <td className="px-3 py-3 text-muted-foreground">
                {t.drivers.length ? t.drivers.map((d) => d.name).join(', ') : '—'}
              </td>
              <td className="px-3 py-3 text-center tabular-nums">{t.wins}</td>
              <td className="px-3 py-3 text-right text-base font-bold tabular-nums text-primary">
                {t.points}
                {t.adjust !== 0 && (
                  <span className="ml-1 text-[10px] font-medium text-muted-foreground">
                    ({t.adjust > 0 ? '+' : ''}{t.adjust})
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
