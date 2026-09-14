/**
 * Наполнение базы стартовыми данными F1 Icons League.
 * Запуск: bun run db:seed
 *
 * Скрипт идемпотентный: главный администратор создаётся при первом запуске,
 * существующие сезон/команды/этапы не дублируются.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const ADMIN_LOGIN = process.env.SEED_ADMIN_LOGIN ?? 'F1Icons_Admin'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'F1Icons_Admin(cloud)'

const TEAMS = [
  { name: 'Red Bull Racing', shortName: 'RBR', color: '#1E2A6E' },
  { name: 'Ferrari', shortName: 'FER', color: '#D40000' },
  { name: 'Mercedes', shortName: 'MER', color: '#00A19C' },
  { name: 'McLaren', shortName: 'MCL', color: '#FF8000' },
  { name: 'Aston Martin', shortName: 'AMR', color: '#006F62' },
  { name: 'Alpine', shortName: 'ALP', color: '#0090FF' },
  { name: 'Williams', shortName: 'WIL', color: '#3671C6' },
  { name: 'RB', shortName: 'RB', color: '#6692FF' },
  { name: 'Kick Sauber', shortName: 'KCK', color: '#52E252' },
  { name: 'Haas', shortName: 'HAA', color: '#B6BABD' },
]

const CALENDAR = [
  { name: 'Гран-при Бахрейна', track: 'Bahrain International Circuit', country: 'Бахрейн', flag: '🇧🇭' },
  { name: 'Гран-при Саудовской Аравии', track: 'Jeddah Corniche Circuit', country: 'Саудовская Аравия', flag: '🇸🇦' },
  { name: 'Гран-при Австралии', track: 'Albert Park', country: 'Австралия', flag: '🇦🇺' },
  { name: 'Гран-при Японии', track: 'Suzuka', country: 'Япония', flag: '🇯🇵' },
  { name: 'Гран-при Имолы', track: 'Autodromo Enzo e Dino Ferrari', country: 'Италия', flag: '🇮🇹' },
  { name: 'Гран-при Монако', track: 'Circuit de Monaco', country: 'Монако', flag: '🇲🇨' },
  { name: 'Гран-при Канады', track: 'Circuit Gilles Villeneuve', country: 'Канада', flag: '🇨🇦' },
  { name: 'Гран-при Великобритании', track: 'Silverstone', country: 'Великобритания', flag: '🇬🇧' },
  { name: 'Гран-при Бельгии', track: 'Spa-Francorchamps', country: 'Бельгия', flag: '🇧🇪' },
  { name: 'Гран-при Италии', track: 'Monza', country: 'Италия', flag: '🇮🇹' },
  { name: 'Гран-при США', track: 'Circuit of the Americas', country: 'США', flag: '🇺🇸' },
  { name: 'Гран-при Абу-Даби', track: 'Yas Marina', country: 'ОАЭ', flag: '🇦🇪' },
]

async function main() {
  // 1. Главный администратор
  const existingAdmin = await db.user.findUnique({ where: { username: ADMIN_LOGIN } })
  const admin = existingAdmin
    ? await db.user.update({ where: { id: existingAdmin.id }, data: { role: 'SUPERADMIN', blocked: false } })
    : await db.user.create({
        data: {
          username: ADMIN_LOGIN,
          displayName: 'Администрация лиги',
          password: await bcrypt.hash(ADMIN_PASSWORD, 10),
          role: 'SUPERADMIN',
        },
      })
  console.log(`✓ Главный администратор: ${admin.username}`)

  // 2. Стартовый сезон
  let season = await db.season.findFirst({ where: { isCurrent: true } })
  if (!season) {
    season = await db.season.create({
      data: {
        name: 'Сезон 1 · F1 25',
        slug: 'season-1',
        status: 'UPCOMING',
        isCurrent: true,
        applicationsOpen: true,
        description:
          'Первый сезон F1 Icons League по игре F1 25. Заезды по расписанию, 50% дистанции, обязательный пит-стоп.',
        rules: [
          'Гонки проводятся на 50% дистанции с обязательным пит-стопом.',
          'Помощь: ABS и трекшн-контроль разрешены, автопилот в поворотах запрещён.',
          'Контакт, повлёкший преимущество, наказывается штрафом по решению судейской коллегии.',
          'Опоздание на квалификацию допускает старт с конца пелотона.',
          'Все инциденты разбираются по записям с обеих сторон в течение 48 часов после гонки.',
        ].join('\n'),
      },
    })
    console.log(`✓ Создан сезон: ${season.name}`)
  }

  // 3. Команды
  for (const [index, team] of TEAMS.entries()) {
    const exists = await db.team.findFirst({ where: { seasonId: season.id, name: team.name } })
    if (!exists) {
      await db.team.create({ data: { ...team, seasonId: season.id, order: index } })
    }
  }
  console.log(`✓ Команд в сезоне: ${await db.team.count({ where: { seasonId: season.id } })}`)

  // 4. Календарь: этапы раз в неделю, 20:00 по местному времени сервера
  const racesCount = await db.race.count({ where: { seasonId: season.id } })
  if (racesCount === 0) {
    const start = new Date()
    start.setDate(start.getDate() + 7)
    start.setHours(20, 0, 0, 0)

    for (const [index, race] of CALENDAR.entries()) {
      const date = new Date(start)
      date.setDate(start.getDate() + index * 7)
      await db.race.create({
        data: { ...race, seasonId: season.id, round: index + 1, date, laps: null, status: 'SCHEDULED' },
      })
    }
    console.log(`✓ Календарь: ${CALENDAR.length} этапов`)
  }

  // 5. Приветственная новость
  const newsCount = await db.news.count()
  if (newsCount === 0) {
    await db.news.create({
      data: {
        title: 'Набор пилотов в первый сезон F1 Icons League открыт',
        slug: 'nabor-pilotov-otkryt',
        excerpt:
          'Регистрация и приём заявок в первый сезон лиги по F1 25 официально открыты. Заполните анкету пилота — администрация рассмотрит её и определит вас в команду.',
        content: [
          'Мы запускаем первый сезон F1 Icons League по игре F1 25.',
          'Что вас ждёт: полноценный календарь этапов, личный и командный зачёт, судейство инцидентов и трансляции гонок.',
          'Как попасть в лигу: зарегистрируйтесь на сайте, заполните анкету во вкладке «Заявка в лигу» и дождитесь решения администрации. Статус заявки всегда виден в личном кабинете.',
          'До встречи на трассе!',
        ].join('\n\n'),
        published: true,
        pinned: true,
        authorId: admin.id,
      },
    })
    console.log('✓ Создана приветственная новость')
  }

  console.log('\nГотово. Вход в админ-панель: /login → логин F1Icons_Admin')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
