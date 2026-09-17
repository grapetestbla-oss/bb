import Link from 'next/link'
import { db } from '@/lib/db'
import { SetupCard } from '@/components/setup-card'
import { parseJson } from '@/lib/api'

export const dynamic = 'force-dynamic'

const CREDENTIALS = [
  '🏆 Сетапы, проверенные в онлайн-лигах и тайм-триале',
  '🏎️ Все трассы F1 25 и 2026 Season Pack',
  '🛠️ Обновление после каждого патча игры',
  '🎓 Личное обучение с разбором телеметрии',
]

export default async function HomePage() {
  const [tracksCount, setupsCount, featured, s2026, plans] = await Promise.all([
    db.track.count({ where: { active: true } }),
    db.setup.count({ where: { active: true } }),
    db.setup.findMany({
      where: { active: true, pack: 'f125' },
      include: { track: true },
      take: 3,
      orderBy: [{ featured: 'desc' }, { sales: 'desc' }],
    }),
    db.setup.findMany({
      where: { active: true, pack: 's2026' },
      include: { track: true },
      take: 3,
      orderBy: [{ featured: 'desc' }, { sales: 'desc' }],
    }),
    db.trainingPlan.findMany({ where: { active: true }, orderBy: { order: 'asc' }, take: 3 }),
  ])

  return (
    <>
      {/* ГЕРОЙ */}
      <section className="relative isolate flex min-h-[460px] items-end overflow-hidden md:min-h-[640px]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              'linear-gradient(0deg, rgba(0,0,0,.92) 0%, rgba(0,0,0,.35) 45%, rgba(0,0,0,.6) 100%),' +
              'linear-gradient(180deg, #1d2a1c 0%, #243018 18%, #6b6b6f 30%, #3a3a3e 40%, #17171a 55%, #0d0d0f 100%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-[24%] -z-10 h-14 opacity-35 blur-[18px]"
          style={{
            background: 'repeating-linear-gradient(90deg, #cfcfcf 0 70px, #8e2622 70px 140px)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-1/2 opacity-50 blur-[3px]"
          style={{
            background:
              'repeating-linear-gradient(0deg, rgba(255,255,255,.045) 0 1px, transparent 1px 9px)',
          }}
        />

        <div className="mx-auto w-full max-w-7xl px-4 pb-12 md:pb-16">
          <h1 className="f1-title text-[clamp(1.8rem,5.4vw,4rem)] text-white">
            Точность · Скорость · Стабильность
          </h1>
          <Link
            href="/catalog"
            className="f1-eyebrow mt-6 inline-block bg-black px-8 py-4 text-white ring-1 ring-white/20 transition-colors hover:bg-white hover:text-black"
          >
            Купить сейчас
          </Link>
        </div>
      </section>

      {/* О МАСТЕРСКОЙ */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
          <h2 className="f1-title text-[clamp(1.3rem,3vw,2.1rem)] text-white">Собрано Fantastiqueboy</h2>
          <ul className="mt-8 flex flex-col gap-3 text-white/75">
            {CREDENTIALS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mx-auto mt-8 max-w-xl text-white/60">
            Каждый сетап на этом сайте собран, протестирован и обновляется в течение сезона.
            Сейчас в каталоге {setupsCount} сетапов на {tracksCount} трассах.
          </p>
        </div>
      </section>

      {/* ПАКЕТЫ F1 25 */}
      <Showcase
        title="Сетапы F1 25"
        href="/catalog?pack=f125"
        linkLabel="Все сетапы F1 25"
        items={featured}
      />

      {/* 2026 SEASON PACK */}
      <Showcase
        title="2026 Season Pack"
        href="/catalog?pack=s2026"
        linkLabel="Все сетапы 2026"
        items={s2026}
      />

      {/* ОБУЧЕНИЕ */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <h2 className="f1-title text-center text-[clamp(1.3rem,3vw,2.1rem)] text-white">
            Пакеты обучения
          </h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Link key={plan.id} href="/training" className="group block text-center">
                <div className="tile border border-white/10 transition-colors group-hover:border-white/35">
                  <span className="f1-title relative z-10 px-6 text-center text-sm text-white/85">
                    {plan.duration}
                  </span>
                </div>
                <h3 className="f1-title mt-4 text-sm text-white">{plan.title}</h3>
                <p className="mt-2 text-sm text-white/70">{plan.price.toFixed(0)} ₽</p>
                <p className="mx-auto mt-2 max-w-xs text-xs text-white/45">
                  {parseJson<string[]>(plan.features, []).slice(0, 2).join(' · ')}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/training"
              className="f1-eyebrow inline-block border border-white/25 px-8 py-4 text-white transition-colors hover:bg-white hover:text-black"
            >
              Оставить заявку
            </Link>
          </div>
        </div>
      </section>

      {/* ПРОЗРАЧНОСТЬ */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
          <h2 className="f1-title text-[clamp(1.3rem,3vw,2.1rem)] text-white">Полная прозрачность</h2>
          <p className="mt-6 text-white/65">
            Параметры сетапа — 21 значение — открываются в личном кабинете сразу после оплаты и
            остаются там навсегда. До покупки видны только антикрылья и баланс тормозов, чтобы вы
            понимали характер настройки.
          </p>
        </div>
      </section>
    </>
  )
}

type ShowcaseItem = Parameters<typeof SetupCard>[0]['setup']

function Showcase({
  title,
  href,
  linkLabel,
  items,
}: {
  title: string
  href: string
  linkLabel: string
  items: ShowcaseItem[]
}) {
  if (!items.length) return null

  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
        <h2 className="f1-title text-center text-[clamp(1.3rem,3vw,2.1rem)] text-white">{title}</h2>
        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((setup) => (
            <SetupCard key={setup.id} setup={setup} />
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href={href}
            className="f1-eyebrow inline-block border border-white/25 px-8 py-4 text-white transition-colors hover:bg-white hover:text-black"
          >
            {linkLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
