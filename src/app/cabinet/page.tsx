import Link from 'next/link'
import { redirect } from 'next/navigation'
import { CalendarDays, Flag, Medal, Timer, Trophy } from 'lucide-react'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getCurrentSeason, getSeasonStandings } from '@/lib/standings'
import {
  APPLICATION_STATUS, ENTRY_STATUS, ROLE_LABEL, formatDate, formatDateTime, positionClass,
} from '@/lib/format'
import { PageHeader } from '@/components/page-header'
import { ProfileForm } from '@/components/profile-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Личный кабинет' }

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
}

export default async function CabinetPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const season = await getCurrentSeason()

  const [applications, entry, standings, nextRace] = await Promise.all([
    db.application.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: { season: { select: { name: true } } },
    }),
    season
      ? db.seasonEntry.findFirst({
          where: { userId: user.id, seasonId: season.id },
          include: {
            team: true,
            results: { include: { race: true }, orderBy: { race: { round: 'asc' } } },
          },
        })
      : null,
    season ? getSeasonStandings(season.id) : null,
    season
      ? db.race.findFirst({
          where: { seasonId: season.id, status: { in: ['SCHEDULED', 'LIVE'] } },
          orderBy: { date: 'asc' },
        })
      : null,
  ])

  const myStanding = entry && standings ? standings.drivers.find((d) => d.entryId === entry.id) : null

  const stats = [
    { icon: Trophy, label: 'Место в зачёте', value: myStanding ? `${myStanding.position}` : '—' },
    { icon: Medal, label: 'Очки', value: myStanding ? myStanding.points : '—' },
    { icon: Flag, label: 'Победы', value: myStanding ? myStanding.wins : '—' },
    { icon: Timer, label: 'Подиумы', value: myStanding ? myStanding.podiums : '—' },
  ]

  return (
    <div>
      <PageHeader
        eyebrow={ROLE_LABEL[user.role] ?? 'Участник'}
        title={user.displayName}
        subtitle={`@${user.username}${user.gameNick ? ` · ник в игре: ${user.gameNick}` : ''}`}
      >
        <div className="flex gap-2">
          {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
            <Button asChild variant="outline"><Link href="/admin">Админ-панель</Link></Button>
          )}
          <Button asChild><Link href="/standings">Таблица зачёта</Link></Button>
        </div>
      </PageHeader>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
        {/* Статус участия */}
        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="surface p-6">
            <h2 className="text-lg font-bold">Участие в сезоне</h2>
            {entry ? (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {entry.team && (
                    <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <span className="h-6 w-1.5 rounded-full" style={{ background: entry.team.color }} />
                      <span className="font-semibold">{entry.team.name}</span>
                    </span>
                  )}
                  {entry.number && <Badge variant="outline">Номер #{entry.number}</Badge>}
                  <Badge variant="secondary">{ENTRY_STATUS[entry.status] ?? entry.status}</Badge>
                  <Badge variant="outline" className="border-primary/40 text-primary">{season?.name}</Badge>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {stats.map((s) => (
                    <div key={s.label} className="rounded-lg border border-border bg-muted/30 p-4">
                      <s.icon className="h-4 w-4 text-primary" />
                      <div className="mt-2 text-xl font-black tabular-nums">{s.value}</div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">
                  Вы пока не заявлены в текущий сезон. Подайте заявку — администрация рассмотрит анкету и определит вас в команду.
                </p>
                <Button asChild className="mt-4"><Link href="/apply">Подать заявку</Link></Button>
              </div>
            )}
          </div>

          <div className="surface p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <CalendarDays className="h-4 w-4 text-primary" /> Ближайший этап
            </h2>
            {nextRace ? (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Этап {nextRace.round}</div>
                <div className="mt-1 text-xl font-bold">{nextRace.name}</div>
                <div className="text-sm text-muted-foreground">{nextRace.track}</div>
                <div className="mt-3 text-sm font-semibold tabular-nums">{formatDateTime(nextRace.date)}</div>
                {nextRace.broadcastUrl && (
                  <a href={nextRace.broadcastUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-primary hover:underline">
                    Ссылка на трансляцию
                  </a>
                )}
                <Button asChild variant="outline" size="sm" className="mt-4">
                  <Link href="/calendar">Весь календарь</Link>
                </Button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Ближайшие этапы пока не запланированы.</p>
            )}
          </div>
        </section>

        {/* Мои результаты */}
        {entry && entry.results.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-bold">Мои результаты</h2>
            <div className="surface overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 text-left">Этап</th>
                    <th className="px-3 py-3 text-left">Гонка</th>
                    <th className="px-3 py-3 text-center">Позиция</th>
                    <th className="px-3 py-3 text-center">Поул</th>
                    <th className="px-3 py-3 text-center">Быстрый круг</th>
                    <th className="px-3 py-3 text-right">Очки</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.results.map((r) => (
                    <tr key={r.id} className="table-row-hover border-b border-border/60 last:border-0">
                      <td className="px-3 py-3 tabular-nums">{r.race.round}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium">{r.race.name}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(r.race.date)}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {r.dnf ? (
                          <Badge variant="destructive">DNF</Badge>
                        ) : (
                          <span className={positionClass(r.position ?? 0)}>{r.position ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">{r.pole ? '✓' : '—'}</td>
                      <td className="px-3 py-3 text-center">{r.fastestLap ? '✓' : '—'}</td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums text-primary">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Заявки */}
        <section>
          <h2 className="mb-3 text-lg font-bold">Мои заявки</h2>
          {applications.length ? (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id} className="surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariant[app.status] ?? 'secondary'}>
                          {APPLICATION_STATUS[app.status] ?? app.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {app.season?.name ?? 'Без привязки к сезону'}
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        Ник: <span className="font-semibold">{app.gameNick}</span> · Платформа:{' '}
                        <span className="font-semibold">{app.platform}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">Подана {formatDateTime(app.createdAt)}</div>
                  </div>
                  {app.adminComment && (
                    <p className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                      Комментарий администрации: {app.adminComment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="surface p-6 text-sm text-muted-foreground">
              Вы ещё не подавали заявок.{' '}
              <Link href="/apply" className="font-semibold text-primary hover:underline">Подать заявку</Link>
            </div>
          )}
        </section>

        {/* Профиль */}
        <section>
          <h2 className="mb-3 text-lg font-bold">Настройки профиля</h2>
          <div className="surface p-6">
            <ProfileForm user={user} />
          </div>
        </section>
      </div>
    </div>
  )
}
