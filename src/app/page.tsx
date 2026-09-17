import Link from 'next/link'
import { db } from '@/lib/db'
import { SetupCard } from '@/components/setup-card'
import { PackCard } from '@/components/pack-card'
import { getOwnedSetupIds } from '@/lib/ownership'
import { getCurrentUser } from '@/lib/auth'
import { parseJson } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** Склонение существительного по числу: 1 сетап, 2 сетапа, 5 сетапов. */
function plural(count: number, one: string, few: string, many: string) {
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = count % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

const EMPTY_NOTE =
  'Каталог наполняется: сетапы и паки появятся здесь сразу после добавления. ' +
  'Пока можно записаться на обучение или написать в Telegram.'

const CREDENTIALS = [
  '🏁 Один сетап на трассу: сухо и дождь в одном товаре',
  '🏎️ Все трассы F1 25 и 2026 Season Pack',
  '👤 Паки от разных пилотов — выбирайте почерк под себя',
  '🎓 Личное обучение с разбором телеметрии',
]

export default async function HomePage() {
  const user = await getCurrentUser()
  const [tracksCount, setupsCount, pilotsCount, packs, featured, plans] = await Promise.all([
    db.track.count({ where: { active: true } }),
    db.setup.count({ where: { active: true } }),
    db.pilot.count({ where: { active: true } }),
    db.pack.findMany({
      where: { active: true, game: 'all' },
      include: { pilot: true, _count: { select: { setups: true } } },
      orderBy: [{ featured: 'desc' }, { order: 'asc' }],
      take: 3,
    }),
    db.setup.findMany({
      where: { active: true },
      include: { track: true, pilot: true, variants: { orderBy: { order: 'asc' } } },
      orderBy: [{ featured: 'desc' }, { sales: 'desc' }],
      take: 30,
    }),
    db.trainingPlan.findMany({ where: { active: true }, orderBy: { order: 'asc' }, take: 3 }),
  ])

  const owned = await getOwnedSetupIds(user?.id)

  // на главной показываем разные трассы, а не одну трассу от каждого пилота
  const highlights = featured
    .filter((setup, index, all) => all.findIndex((s) => s.trackId === setup.trackId) === index)
    .slice(0, 3)

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
          style={{ background: 'repeating-linear-gradient(90deg, #cfcfcf 0 70px, #8e2622 70px 140px)' }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-1/2 opacity-50 blur-[3px]"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.045) 0 1px, transparent 1px 9px)',
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

      {/* О МАГАЗИНЕ */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
          <h2 className="f1-title text-[clamp(1.3rem,3vw,2.1rem)] text-white">Как это устроено</h2>
          <ul className="mt-8 flex flex-col gap-3 text-white/75">
            {CREDENTIALS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mx-auto mt-8 max-w-xl text-white/60">
            Квалификацию и гонку мы не разделяем — настройки под них почти совпадают. Покупаете
            трассу и получаете оба варианта: сухо и дождь.
            {setupsCount > 0
              ? ` Сейчас в каталоге ${setupsCount} ${plural(setupsCount, 'сетап', 'сетапа', 'сетапов')} на ${tracksCount} ${plural(tracksCount, 'трассе', 'трассах', 'трассах')} от ${pilotsCount} ${plural(pilotsCount, 'пилота', 'пилотов', 'пилотов')}.`
              : ` В игре ${tracksCount} ${plural(tracksCount, 'трасса', 'трассы', 'трасс')} — сетапы выкладываются по мере готовности.`}
          </p>
        </div>
      </section>

      {/* КАТАЛОГ ПУСТ */}
      {packs.length === 0 && highlights.length === 0 && (
        <section className="border-t border-white/10">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
            <h2 className="f1-title text-[clamp(1.3rem,3vw,2.1rem)] text-white">Скоро в продаже</h2>
            <p className="mx-auto mt-6 max-w-xl text-white/60">{EMPTY_NOTE}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/training"
                className="f1-eyebrow inline-block border border-white/25 px-8 py-4 text-white transition-colors hover:bg-white hover:text-black"
              >
                Обучение
              </Link>
              <Link
                href="/catalog"
                className="f1-eyebrow inline-block border border-white/25 px-8 py-4 text-white transition-colors hover:bg-white hover:text-black"
              >
                Каталог
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ПАКИ ПИЛОТОВ */}
      {packs.length > 0 && (
        <section className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
            <h2 className="f1-title text-center text-[clamp(1.3rem,3vw,2.1rem)] text-white">
              Фулл паки
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-sm text-white/55">
              Все трассы F1 25 и 2026 Season Pack от одного пилота одной покупкой. Отдельные паки по
              играм — на странице паков.
            </p>
            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {packs.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={{ ...pack, tracksCount: pack._count.setups }}
                />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/packs"
                className="f1-eyebrow inline-block border border-white/25 px-8 py-4 text-white transition-colors hover:bg-white hover:text-black"
              >
                Все паки и наборы по играм
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ОТДЕЛЬНЫЕ ТРАССЫ */}
      {highlights.length > 0 && (
        <section className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
            <h2 className="f1-title text-center text-[clamp(1.3rem,3vw,2.1rem)] text-white">
              Сетапы по трассам
            </h2>
            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((setup) => (
                <SetupCard key={setup.id} setup={{ ...setup, owned: owned.has(setup.id) }} />
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/catalog"
                className="f1-eyebrow inline-block border border-white/25 px-8 py-4 text-white transition-colors hover:bg-white hover:text-black"
              >
                Весь каталог
              </Link>
            </div>
          </div>
        </section>
      )}

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
            Параметры сетапа — 21 значение на каждый вариант — открываются в личном кабинете сразу
            после оплаты и остаются там навсегда. До покупки видны только антикрылья и баланс
            тормозов, чтобы вы понимали характер настройки.
          </p>
        </div>
      </section>
    </>
  )
}
