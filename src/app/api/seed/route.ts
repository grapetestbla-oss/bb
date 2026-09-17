import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { handleError, ok } from '@/lib/api'
import { ALL_TRACKS, EMPTY_SETUP, type SetupData } from '@/lib/f1-data'
import { DEFAULT_PAYMENTS, DEFAULT_SITE, setSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

const ADMIN_LOGIN = 'fantasticqueboy'
const ADMIN_PASSWORD = 'fantasticqueboy'

/** Псевдослучайное, но детерминированное значение по slug трассы. */
function seededValue(slug: string, salt: number, min: number, max: number, step = 1) {
  let hash = salt
  for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) % 100000
  const steps = Math.floor((max - min) / step) + 1
  const value = min + (hash % steps) * step
  return Number(value.toFixed(2))
}

function buildSetup(
  slug: string,
  condition: 'dry' | 'wet',
  style: 'balanced' | 'aggressive' | 'stable'
): SetupData {
  const downforceBias = condition === 'wet' ? 10 : style === 'aggressive' ? 0 : 3
  const stiffness = style === 'stable' ? -4 : style === 'aggressive' ? 4 : 0
  const type = condition
  return {
    ...EMPTY_SETUP,
    frontWing: Math.min(50, seededValue(slug, 1, 8, 42) + downforceBias),
    rearWing: Math.min(50, seededValue(slug, 2, 6, 40) + downforceBias),
    diffOnThrottle: seededValue(slug, 3, 50, 85),
    diffOffThrottle: seededValue(slug, 4, 45, 75),
    engineBraking: seededValue(slug, 5, 30, 80),
    frontCamber: seededValue(slug, 6, -3.5, -2.5, 0.1),
    rearCamber: seededValue(slug, 7, -2.0, -1.0, 0.1),
    frontToe: seededValue(slug, 8, 0.0, 0.2, 0.01),
    rearToe: seededValue(slug, 9, 0.1, 0.4, 0.01),
    frontSuspension: Math.max(1, Math.min(41, seededValue(slug, 10, 1, 41) + stiffness)),
    rearSuspension: Math.max(1, Math.min(41, seededValue(slug, 11, 1, 41) + stiffness)),
    frontAntiRoll: seededValue(slug, 12, 1, 21),
    rearAntiRoll: seededValue(slug, 13, 1, 21),
    frontRideHeight: seededValue(slug, 14, 20, 40),
    rearRideHeight: seededValue(slug, 15, 50, 80),
    brakePressure: type === 'wet' ? 92 : seededValue(slug, 16, 95, 100),
    brakeBias: seededValue(slug, 17, 52, 62),
    frontRightTyre: type === 'wet' ? 24.5 : seededValue(slug, 18, 22.5, 26.0, 0.5),
    frontLeftTyre: type === 'wet' ? 24.5 : seededValue(slug, 18, 22.5, 26.0, 0.5),
    rearRightTyre: type === 'wet' ? 22.5 : seededValue(slug, 19, 20.5, 24.0, 0.5),
    rearLeftTyre: type === 'wet' ? 22.5 : seededValue(slug, 19, 20.5, 24.0, 0.5),
  }
}

/// Пилоты — авторы сетапов. У каждого свой почерк настройки.
const PILOTS = [
  {
    slug: 'fantasticqueboy',
    name: 'Fantastiqueboy',
    title: 'Владелец магазина · тренер',
    bio: 'Сетапы под стабильный темп в гонке: машина предсказуема на торможениях и бережёт резину.',
    contact: '@fantasticqueboy',
    order: 1,
    style: 'balanced' as const,
    price: 199,
  },
  {
    slug: 'kolya',
    name: 'Коля',
    title: 'Пилот лиги · квалификационный специалист',
    bio: 'Острый перед и максимум скорости на один круг. Требует аккуратной работы с газом.',
    contact: '@kolya',
    order: 2,
    style: 'aggressive' as const,
    price: 219,
  },
  {
    slug: 'pad-master',
    name: 'Pad Master',
    title: 'Пилот на геймпаде',
    bio: 'Настройки под геймпад: мягкая подвеска, меньше отзывчивости на входе, больше контроля.',
    contact: '@padmaster',
    order: 3,
    style: 'stable' as const,
    price: 179,
  },
]

export async function POST() {
  try {
    // 1. Администратор
    const adminPassword = await hashPassword(ADMIN_PASSWORD)
    const admin = await db.user.upsert({
      where: { login: ADMIN_LOGIN },
      update: { role: 'admin' },
      create: {
        login: ADMIN_LOGIN,
        email: 'fantasticqueboy@fantastiqueboysetups.gg',
        password: adminPassword,
        role: 'admin',
        contact: '@fantasticqueboy',
      },
    })

    // 2. Трассы
    for (const track of ALL_TRACKS) {
      await db.track.upsert({
        where: { slug: track.slug },
        update: { ...track },
        create: { ...track },
      })
    }

    // 3. Пилоты
    type SeededPilot = { id: string; slug: string; name: string; order: number } & {
      style: 'balanced' | 'aggressive' | 'stable'
      price: number
    }
    const pilots: SeededPilot[] = []
    for (const pilot of PILOTS) {
      const { style, price, ...fields } = pilot
      const row = await db.pilot.upsert({
        where: { slug: pilot.slug },
        update: fields,
        create: fields,
      })
      pilots.push({ ...row, style, price })
    }

    // 4. Сетапы: один товар на трассу от каждого пилота, внутри сухо и дождь
    const tracks = await db.track.findMany()
    let created = 0
    for (const track of tracks) {
      for (const pilot of pilots) {
        const exists = await db.setup.findFirst({
          where: { trackId: track.id, pilotId: pilot.id },
        })
        if (exists) continue

        const dry = buildSetup(track.slug, 'dry', pilot.style)
        const wet = buildSetup(track.slug, 'wet', pilot.style)

        await db.setup.create({
          data: {
            trackId: track.id,
            pilotId: pilot.id,
            title: `${track.name} — ${pilot.name}`,
            pack: track.pack === 's2026' ? 's2026' : 'f125',
            price: track.pack === 's2026' ? pilot.price + 50 : pilot.price,
            description:
              `Сетап на ${track.name} от ${pilot.name}. В комплекте настройки на сухую трассу ` +
              '(подходят и для квалификации, и для гонки) и отдельный вариант на дождь.',
            previewData: JSON.stringify({
              frontWing: dry.frontWing,
              rearWing: dry.rearWing,
              brakeBias: dry.brakeBias,
            }),
            featured: track.round <= 2,
            variants: {
              create: [
                {
                  condition: 'dry',
                  title: 'Сухая трасса',
                  notes: 'Квалификация и гонка: разница только в уровне топлива и режиме мотора.',
                  data: JSON.stringify(dry),
                  order: 0,
                },
                {
                  condition: 'wet',
                  title: 'Дождь',
                  notes: 'Больше прижимной силы, выше клиренс, мягче тормоза.',
                  data: JSON.stringify(wet),
                  order: 1,
                },
              ],
            },
          },
        })
        created += 1
      }
    }

    // 5. Паки: по играм и отдельный фулл пак на всё сразу
    let packsCreated = 0
    for (const pilot of pilots) {
      for (const game of ['f125', 's2026'] as const) {
        const slug = `${pilot.slug}-${game}`
        const exists = await db.pack.findUnique({ where: { slug } })
        if (exists) continue

        const setups = await db.setup.findMany({
          where: { pilotId: pilot.id, pack: game },
          select: { id: true },
        })
        if (!setups.length) continue

        const full = setups.reduce((sum) => sum + pilot.price, 0)
        await db.pack.create({
          data: {
            slug,
            title: `${pilot.name} — полный пак ${game === 'f125' ? 'F1 25' : '2026'}`,
            description:
              `Все ${setups.length} трасс от ${pilot.name}: сухо и дождь на каждой. ` +
              'Обновляется в течение сезона, доступ навсегда.',
            pilotId: pilot.id,
            game,
            price: Math.round((full * 0.45) / 10) * 10,
            oldPrice: full,
            featured: false,
            order: pilot.order * 10 + (game === 'f125' ? 1 : 2),
            setups: { create: setups.map((setup) => ({ setupId: setup.id })) },
          },
        })
        packsCreated += 1
      }

      // Фулл пак: обе игры, все трассы пилота
      const fullSlug = `${pilot.slug}-full`
      const hasFull = await db.pack.findUnique({ where: { slug: fullSlug } })
      if (!hasFull) {
        const all = await db.setup.findMany({ where: { pilotId: pilot.id }, select: { id: true } })
        if (all.length) {
          const separately = all.length * pilot.price
          await db.pack.create({
            data: {
              slug: fullSlug,
              title: `${pilot.name} — фулл пак`,
              description:
                `Всё сразу: ${all.length} трасс F1 25 и 2026 Season Pack от ${pilot.name}, ` +
                'сухо и дождь на каждой. Новые трассы и обновления после патчей входят в пак — ' +
                'доплачивать не нужно.',
              pilotId: pilot.id,
              game: 'all',
              price: Math.round((separately * 0.35) / 10) * 10,
              oldPrice: separately,
              featured: true,
              order: pilot.order,
              setups: { create: all.map((setup) => ({ setupId: setup.id })) },
            },
          })
          packsCreated += 1
        }
      }
    }

    // 6. Программы обучения
    const plans = [
      {
        title: 'Разбор пилотажа',
        description: 'Смотрим вашу телеметрию и повторы, находим потери времени, даём чёткий план работы.',
        price: 990,
        duration: '60 минут',
        features: ['Анализ телеметрии', 'Разбор траекторий', 'Домашнее задание', 'Запись сессии'],
        order: 1,
      },
      {
        title: 'Индивидуальная тренировка',
        description: 'Живая сессия на выбранной трассе: торможения, работа с газом, управление резиной.',
        price: 1490,
        duration: '90 минут',
        features: ['Онлайн-сессия', 'Работа над торможениями', 'Настройка сетапа под ваш стиль', 'Поддержка в чате 7 дней'],
        order: 2,
      },
      {
        title: 'Курс «Гоночный инженер»',
        description: 'Пять занятий: настройка машины, стратегия, старт, атака и защита позиции в онлайн-лигах.',
        price: 5900,
        duration: '5 занятий по 90 минут',
        features: ['5 занятий', 'Персональные сетапы на любые трассы', 'Работа над стартами', 'Разбор лиговых гонок'],
        order: 3,
      },
    ]
    for (const plan of plans) {
      const exists = await db.trainingPlan.findFirst({ where: { title: plan.title } })
      if (exists) continue
      await db.trainingPlan.create({
        data: { ...plan, features: JSON.stringify(plan.features) },
      })
    }

    // 7. Настройки по умолчанию
    const hasPayments = await db.setting.findUnique({ where: { key: 'payments' } })
    if (!hasPayments) await setSetting('payments', DEFAULT_PAYMENTS)
    const hasSite = await db.setting.findUnique({ where: { key: 'site' } })
    if (!hasSite) await setSetting('site', DEFAULT_SITE)

    return ok({
      success: true,
      admin: admin.login,
      pilots: pilots.length,
      tracks: tracks.length,
      setupsCreated: created,
      packsCreated,
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function GET() {
  return POST()
}
