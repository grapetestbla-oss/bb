import Link from 'next/link'
import { ArrowRight, CheckCircle2, Flag, GraduationCap, Timer, Trophy, Zap } from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { SetupCard } from '@/components/setup-card'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [tracksCount, setupsCount, salesCount, featured, packs] = await Promise.all([
    db.track.count({ where: { active: true } }),
    db.setup.count({ where: { active: true } }),
    db.order.count({ where: { status: 'paid' } }),
    db.setup.findMany({
      where: { active: true, featured: true },
      include: { track: true },
      take: 6,
      orderBy: { sales: 'desc' },
    }),
    db.track.groupBy({ by: ['pack'], _count: { _all: true } }),
  ])

  const fallback = featured.length
    ? featured
    : await db.setup.findMany({ where: { active: true }, include: { track: true }, take: 6 })

  const packCount = (pack: string) => packs.find((p) => p.pack === pack)?._count._all ?? 0

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="absolute inset-0 speed-lines opacity-40" />
        <div className="absolute -left-40 top-10 h-80 w-80 rounded-full bg-[#e10600]/20 blur-[120px]" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
          <Badge className="mb-5 bg-[#e10600]/15 text-[#ff4d38] uppercase tracking-widest">
            F1 25 · 2026 Season Pack
          </Badge>
          <h1 className="f1-title max-w-4xl text-4xl leading-[1.05] md:text-6xl lg:text-7xl">
            Сетапы, которые
            <span className="text-[#e10600] f1-text-glow"> находят время</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Готовые настройки на каждую трассу F1 25 — квалификация, гонка и дождь. Плюс личное
            обучение с разбором вашего пилотажа.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-[#e10600] hover:bg-[#ff1a12] f1-red-glow">
              <Link href="/catalog">
                Каталог сетапов <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/25">
              <Link href="/training">
                <GraduationCap className="mr-2 h-4 w-4" /> Записаться на обучение
              </Link>
            </Button>
          </div>

          <div className="mt-8 flex items-center gap-2 lights-out">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="on" />
            ))}
            <span className="ml-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Lights out
            </span>
          </div>

          <div className="mt-12 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { icon: Flag, value: tracksCount, label: 'Трасс в каталоге' },
              { icon: Zap, value: setupsCount, label: 'Готовых сетапов' },
              { icon: Trophy, value: salesCount, label: 'Покупок' },
              { icon: Timer, value: '24/7', label: 'Доступ после оплаты' },
            ].map((stat) => (
              <Card key={stat.label} className="gap-1 border-border/70 bg-card/60 p-4">
                <stat.icon className="h-5 w-5 text-[#e10600]" />
                <div className="f1-title text-2xl">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ПАКЕТЫ */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="f1-title text-3xl md:text-4xl">Два сезона — один гараж</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Card className="stripe-left card-hover border-border/70 bg-card/80 p-6">
            <h3 className="f1-title text-2xl">F1 25</h3>
            <p className="mt-2 text-muted-foreground">
              Все трассы сезона 2025 плюс классические автодромы игры. Сетапы под квалификацию,
              гонку и дождь.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Трасс в каталоге: <span className="font-bold text-foreground">{packCount('f125') + packCount('classic')}</span>
            </p>
            <Button asChild className="mt-5 w-fit bg-[#e10600] hover:bg-[#ff1a12]">
              <Link href="/catalog?pack=f125">Открыть</Link>
            </Button>
          </Card>
          <Card className="stripe-left card-hover border-border/70 bg-card/80 p-6">
            <h3 className="f1-title text-2xl">2026 Season Pack</h3>
            <p className="mt-2 text-muted-foreground">
              Новый регламент, новая аэродинамика и отдача мотора. Сетапы, пересчитанные под машины
              2026 года.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Трасс в каталоге: <span className="font-bold text-foreground">{packCount('s2026')}</span>
            </p>
            <Button asChild className="mt-5 w-fit bg-[#e10600] hover:bg-[#ff1a12]">
              <Link href="/catalog?pack=s2026">Открыть</Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* ПОПУЛЯРНОЕ */}
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="f1-title text-3xl md:text-4xl">Популярные сетапы</h2>
          <Button asChild variant="ghost" className="text-[#e10600]">
            <Link href="/catalog">
              Весь каталог <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fallback.map((setup) => (
            <SetupCard key={setup.id} setup={setup} />
          ))}
        </div>
        {fallback.length === 0 && (
          <Card className="mt-8 border-dashed border-border/70 bg-card/50 p-10 text-center text-muted-foreground">
            Каталог пока пуст — администратор скоро добавит сетапы.
          </Card>
        )}
      </section>

      {/* КАК ЭТО РАБОТАЕТ */}
      <section className="border-y border-border/70 bg-[#0b0b0f]/60">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="f1-title text-3xl md:text-4xl">Как это работает</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-4">
            {[
              { step: '01', title: 'Регистрация', text: 'Создайте аккаунт — на это уходит меньше минуты.' },
              { step: '02', title: 'Выбор', text: 'Найдите трассу и тип сетапа: квала, гонка или дождь.' },
              { step: '03', title: 'Оплата', text: 'FreeKassa, Platega или ручное подтверждение.' },
              { step: '04', title: 'Гонка', text: 'Настройки открываются в профиле сразу после оплаты.' },
            ].map((item) => (
              <Card key={item.step} className="border-border/70 bg-card/80 p-6">
                <span className="f1-title text-4xl text-[#e10600]/70">{item.step}</span>
                <h3 className="mt-3 text-lg font-bold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ОБУЧЕНИЕ CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <Card className="relative overflow-hidden border-border/70 bg-card/80 p-8 md:p-12">
          <div className="absolute right-0 top-0 h-full w-1/3 checkered opacity-10" />
          <div className="relative max-w-2xl">
            <h2 className="f1-title text-3xl md:text-4xl">Индивидуальное обучение</h2>
            <p className="mt-3 text-muted-foreground">
              Разбираем вашу телеметрию, ставим торможения и работу с газом. Занятия на любой
              платформе и любом устройстве управления.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {['PC, PlayStation и Xbox', 'Руль, геймпад или клавиатура', 'Связь в Telegram или Discord', 'Персональные сетапы под ваш стиль'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#e10600]" /> {item}
                  </li>
                )
              )}
            </ul>
            <Button asChild size="lg" className="mt-7 bg-[#e10600] hover:bg-[#ff1a12]">
              <Link href="/training">Оставить заявку</Link>
            </Button>
          </div>
        </Card>
      </section>
    </>
  )
}
