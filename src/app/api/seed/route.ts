import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { handleError, ok } from '@/lib/api'
import { ALL_TRACKS } from '@/lib/f1-data'
import { DEFAULT_PAYMENTS, DEFAULT_SITE, setSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

const ADMIN_LOGIN = 'fantasticqueboy'
const ADMIN_PASSWORD = 'fantasticqueboy'

/**
 * Первичное наполнение: администратор, трассы, программы обучения и настройки.
 * Сетапы и паки не создаются — каталог наполняется вручную через панель.
 */
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
        contact: 'https://t.me/simraceboy',
      },
    })

    // 2. Трассы — справочник, из которого выбираются сетапы в панели
    for (const track of ALL_TRACKS) {
      await db.track.upsert({
        where: { slug: track.slug },
        update: { ...track },
        create: { ...track },
      })
    }

    // 3. Пилот-владелец: к нему привязываются первые сетапы, остальных заводят в панели
    const owner = await db.pilot.upsert({
      where: { slug: 'fantastiqueboy' },
      update: {},
      create: {
        slug: 'fantastiqueboy',
        name: 'Fantastiqueboy',
        title: 'Владелец магазина · тренер',
        bio: 'Сетапы и обучение. Каталог наполняется вручную через панель.',
        contact: 'https://t.me/simraceboy',
        order: 1,
      },
    })

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
      await db.trainingPlan.create({ data: { ...plan, features: JSON.stringify(plan.features) } })
    }

    // 5. Настройки по умолчанию
    const hasPayments = await db.setting.findUnique({ where: { key: 'payments' } })
    if (!hasPayments) await setSetting('payments', DEFAULT_PAYMENTS)
    const hasSite = await db.setting.findUnique({ where: { key: 'site' } })
    if (!hasSite) await setSetting('site', DEFAULT_SITE)

    const [tracks, setups, packs] = await Promise.all([
      db.track.count(),
      db.setup.count(),
      db.pack.count(),
    ])

    return ok({
      success: true,
      admin: admin.login,
      pilot: owner.slug,
      tracks,
      setups,
      packs,
      note: 'Сетапы и паки не создаются: добавьте их вручную в панели.',
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function GET() {
  return POST()
}
