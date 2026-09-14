import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CalendarDays, Flag, Trophy, Users } from 'lucide-react'
import { db } from '@/lib/db'
import { getCurrentSeason, getSeasonStandings } from '@/lib/standings'
import { formatDate, formatDateTime, relativeDays } from '@/lib/format'
import { DriversTable, TeamsTable } from '@/components/standings-tables'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const season = await getCurrentSeason()
  const [news, standings, nextRace, driversCount, teamsCount] = await Promise.all([
    db.news.findMany({
      where: { published: true },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 3,
    }),
    season ? getSeasonStandings(season.id) : null,
    season
      ? db.race.findFirst({
          where: { seasonId: season.id, status: { in: ['SCHEDULED', 'LIVE'] } },
          orderBy: { date: 'asc' },
        })
      : null,
    season ? db.seasonEntry.count({ where: { seasonId: season.id } }) : 0,
    season ? db.team.count({ where: { seasonId: season.id } }) : 0,
  ])

  const stats = [
    { icon: Flag, label: 'Этапов в сезоне', value: standings?.racesTotal ?? 0 },
    { icon: Users, label: 'Пилотов заявлено', value: driversCount },
    { icon: Trophy, label: 'Команд', value: teamsCount },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="hero-grid relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div className="animate-speed-in">
            <Badge variant="outline" className="border-primary/40 text-primary">
              {season ? season.name : 'Сезон скоро · F1 25'}
            </Badge>
            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
              <span className="text-gradient-gold">F1 ICONS</span>
              <br />
              <span className="text-gradient-silver">LEAGUE</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Киберспортивная лига по F1 25. Полноценный сезон с календарём этапов, личным и командным зачётом,
              судейством инцидентов и трансляциями. Подай заявку — и борись за титул чемпиона.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/apply">
                  Подать заявку в лигу <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/standings">Таблица зачёта</Link>
              </Button>
            </div>

            <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="surface p-4">
                  <s.icon className="h-4 w-4 text-primary" />
                  <div className="mt-2 text-2xl font-black tabular-nums">{s.value}</div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="gold-glow rounded-2xl">
              <Image
                src="/logo.jpg"
                alt="F1 Icons League"
                width={640}
                height={640}
                priority
                className="w-full rounded-2xl object-cover"
              />
            </div>
            {nextRace && (
              <div className="gold-border mt-5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
                  <CalendarDays className="h-3.5 w-3.5" /> Ближайший этап
                </div>
                <div className="mt-2 text-lg font-bold">{nextRace.name}</div>
                <div className="text-sm text-muted-foreground">{nextRace.track}</div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="tabular-nums">{formatDateTime(nextRace.date)}</span>
                  {relativeDays(nextRace.date) && (
                    <Badge variant="secondary">{relativeDays(nextRace.date)}</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Зачёт */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Текущий зачёт</h2>
            <p className="text-sm text-muted-foreground">
              {season ? `${season.name} · обновляется после каждого этапа` : 'Сезон ещё не создан'}
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/standings">
              Вся таблица <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Пилоты</h3>
            <DriversTable drivers={(standings?.drivers ?? []).slice(0, 8)} compact />
          </div>
          <div className="min-w-0">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Команды</h3>
            <TeamsTable teams={(standings?.teams ?? []).slice(0, 8)} />
          </div>
        </div>
      </section>

      {/* Новости */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Новости лиги</h2>
            <p className="text-sm text-muted-foreground">Анонсы, итоги этапов и решения судей</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/news">
              Все новости <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {news.length ? (
          <div className="grid gap-5 md:grid-cols-3">
            {news.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.slug}`}
                className="surface group flex flex-col overflow-hidden transition-colors hover:border-primary/50"
              >
                {item.cover ? (
                   
                  <img src={item.cover} alt={item.title} className="h-40 w-full object-cover" />
                ) : (
                  <div className="hero-grid h-40 w-full" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</div>
                  <h3 className="mt-2 text-lg font-bold leading-snug group-hover:text-primary">{item.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="surface p-8 text-center text-sm text-muted-foreground">Новостей пока нет.</p>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="gold-border relative overflow-hidden rounded-2xl p-8 sm:p-12">
          <div className="checkered absolute inset-x-0 top-0 h-1.5 opacity-60" />
          <h2 className="text-2xl font-black sm:text-3xl">
            Готов выйти на старт{' '}
            <span className="text-gradient-gold">{season?.name ?? 'следующего сезона'}</span>?
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Заполни заявку, укажи платформу и игровой ник. Администрация рассмотрит анкету и определит тебя в команду —
            статус заявки всегда виден в личном кабинете.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/apply">Заполнить анкету</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/rules">Читать регламент</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
