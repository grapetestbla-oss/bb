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

function buildSetup(slug: string, type: 'qualifying' | 'race' | 'wet'): SetupData {
  const downforceBias = type === 'wet' ? 10 : type === 'race' ? 3 : 0
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
    frontSuspension: seededValue(slug, 10, 1, 41),
    rearSuspension: seededValue(slug, 11, 1, 41),
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

const TEMPLATES = [
  {
    type: 'qualifying' as const,
    title: 'Квалификационный сетап',
    price: 149,
    description:
      'Максимум скорости на один круг: агрессивная аэродинамика, острый перед и настройки под мягкую резину. Идеально для борьбы за поул.',
  },
  {
    type: 'race' as const,
    title: 'Гоночный сетап',
    price: 199,
    description:
      'Баланс темпа и износа резины на длинной дистанции. Стабильная машина на торможениях и предсказуемая на выходе из поворотов.',
  },
  {
    type: 'wet' as const,
    title: 'Дождевой сетап',
    price: 179,
    description:
      'Повышенная прижимная сила, мягкая подвеска и сниженное давление тормозов — контроль на мокрой трассе и в смешанных условиях.',
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
        email: 'fantasticqueboy@apexsetups.gg',
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

    // 3. Сетапы для каждой трассы
    const tracks = await db.track.findMany()
    let created = 0
    for (const track of tracks) {
      for (const template of TEMPLATES) {
        const exists = await db.setup.findFirst({
          where: { trackId: track.id, type: template.type },
        })
        if (exists) continue
        const data = buildSetup(track.slug, template.type)
        await db.setup.create({
          data: {
            trackId: track.id,
            title: `${template.title} — ${track.name}`,
            type: template.type,
            pack: track.pack === 's2026' ? 's2026' : 'f125',
            price: track.pack === 's2026' ? template.price + 50 : template.price,
            description: template.description,
            data: JSON.stringify(data),
            previewData: JSON.stringify({
              frontWing: data.frontWing,
              rearWing: data.rearWing,
              brakeBias: data.brakeBias,
            }),
            featured: track.round <= 3 && template.type === 'race',
          },
        })
        created += 1
      }
    }

    // 4. Программы обучения
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

    // 5. Настройки по умолчанию
    const hasPayments = await db.setting.findUnique({ where: { key: 'payments' } })
    if (!hasPayments) await setSetting('payments', DEFAULT_PAYMENTS)
    const hasSite = await db.setting.findUnique({ where: { key: 'site' } })
    if (!hasSite) await setSetting('site', DEFAULT_SITE)

    return ok({
      success: true,
      admin: admin.login,
      tracks: tracks.length,
      setupsCreated: created,
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function GET() {
  return POST()
}
