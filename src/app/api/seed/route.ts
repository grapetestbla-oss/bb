import { db } from '@/lib/db'
import { handleError, ok } from '@/lib/api'
import { ALL_TRACKS } from '@/lib/f1-data'
import { DEFAULT_PAYMENTS, DEFAULT_SITE, setSetting } from '@/lib/settings'
import { ensureHiddenRoot } from '@/lib/root-admin'

export const dynamic = 'force-dynamic'

/**
 * Первичное наполнение: трассы, пилот-владелец, программы обучения и настройки.
 * Аккаунты не создаются: панель получает тот, кто зарегистрируется первым.
 * Сетапы и паки тоже не создаются — каталог наполняется вручную через панель.
 */
export async function POST() {
  try {
    // 0. Скрытый служебный админ (не виден в панели, не считается «первым»)
    await ensureHiddenRoot()

    // 1. Трассы — справочник, из которого выбираются сетапы в панели
    for (const track of ALL_TRACKS) {
      await db.track.upsert({
        where: { slug: track.slug },
        update: { ...track },
        create: { ...track },
      })
    }

    // 2. Пилот-владелец: к нему привязываются первые сетапы, остальных заводят в панели
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

    // 3. Программы обучения
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

    // 4. Настройки по умолчанию
    const hasPayments = await db.setting.findUnique({ where: { key: 'payments' } })
    if (!hasPayments) await setSetting('payments', DEFAULT_PAYMENTS)
    const hasSite = await db.setting.findUnique({ where: { key: 'site' } })
    if (!hasSite) await setSetting('site', DEFAULT_SITE)

    const [tracks, setups, packs, users] = await Promise.all([
      db.track.count(),
      db.setup.count(),
      db.pack.count(),
      db.user.count({ where: { hidden: false } }),
    ])

    return ok({
      success: true,
      pilot: owner.slug,
      tracks,
      setups,
      packs,
      users,
      note:
        users === 0
          ? 'Аккаунтов нет: первый зарегистрировавшийся получит панель управления.'
          : 'Владелец уже зарегистрирован. Сетапы и паки добавляются вручную в панели.',
    })
  } catch (error) {
    return handleError(error)
  }
}

export async function GET() {
  return POST()
}
