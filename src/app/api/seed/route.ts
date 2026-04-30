import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Delete all existing data in reverse dependency order
    await db.moderatorLog.deleteMany()
    await db.notification.deleteMany()
    await db.chatMessage.deleteMany()
    await db.review.deleteMany()
    await db.order.deleteMany()
    await db.service.deleteMany()
    await db.category.deleteMany()
    await db.platformSettings.deleteMany()
    await db.user.deleteMany()

    // ─── Create Categories ─────────────────────────────────────────────
    const [trophyCat, brawlerCat, questCat, rankCat] = await Promise.all([
      db.category.create({
        data: { name: 'Трофеи', slug: 'trophies', icon: '🏆', order: 1 },
      }),
      db.category.create({
        data: { name: 'Бойцы', slug: 'brawlers', icon: '⚔️', order: 2 },
      }),
      db.category.create({
        data: { name: 'Квесты', slug: 'quests', icon: '📋', order: 3 },
      }),
      db.category.create({
        data: { name: 'Ранги', slug: 'ranks', icon: '👑', order: 4 },
      }),
    ])

    // ─── Create Users ──────────────────────────────────────────────────
    const [admin, moderator, booster1, booster2, client1, client2] =
      await Promise.all([
        db.user.create({
          data: {
            email: 'admin@brawlboost.ru',
            username: 'AdminBrawl',
            password: '123456',
            role: 'admin',
            avatar: null,
            balance: 0,
            rating: 5,
            reviewsCount: 0,
            verified: true,
            blocked: false,
            achievements: JSON.stringify(['admin_badge']),
          },
        }),
        db.user.create({
          data: {
            email: 'mod@brawlboost.ru',
            username: 'ModeratorPro',
            password: '123456',
            role: 'moderator',
            avatar: null,
            balance: 0,
            rating: 4.5,
            reviewsCount: 2,
            verified: true,
            blocked: false,
            achievements: JSON.stringify(['moderator_badge', 'trusted']),
          },
        }),
        db.user.create({
          data: {
            email: 'booster1@brawlboost.ru',
            username: 'BoosterMax',
            password: '123456',
            role: 'booster',
            avatar: null,
            balance: 15000,
            rating: 4.8,
            reviewsCount: 24,
            verified: true,
            blocked: false,
            achievements: JSON.stringify([
              'top_booster',
              '100_orders',
              'fast_completion',
            ]),
          },
        }),
        db.user.create({
          data: {
            email: 'booster2@brawlboost.ru',
            username: 'ProBooster',
            password: '123456',
            role: 'booster',
            avatar: null,
            balance: 8500,
            rating: 4.5,
            reviewsCount: 15,
            verified: true,
            blocked: false,
            achievements: JSON.stringify(['trusted', '50_orders']),
          },
        }),
        db.user.create({
          data: {
            email: 'client1@brawlboost.ru',
            username: 'BrawlFan2024',
            password: '123456',
            role: 'client',
            avatar: null,
            balance: 5000,
            rating: 0,
            reviewsCount: 0,
            verified: false,
            blocked: false,
            achievements: JSON.stringify([]),
          },
        }),
        db.user.create({
          data: {
            email: 'client2@brawlboost.ru',
            username: 'GamerPro99',
            password: '123456',
            role: 'client',
            avatar: null,
            balance: 3000,
            rating: 0,
            reviewsCount: 0,
            verified: true,
            blocked: false,
            achievements: JSON.stringify(['first_order']),
          },
        }),
      ])

    // ─── Create Services ───────────────────────────────────────────────
    const services = await Promise.all([
      db.service.create({
        data: {
          title: 'Буст трофеев до 5000',
          description:
            'Быстрый и безопасный буст трофеев до 5000. Опытный бустер доведёт ваш аккаунт до нужного количества трофеев максимально быстро. Используем безопасные методы, без ботов и читов.',
          price: 1200,
          image: null,
          categoryId: trophyCat.id,
          boosterId: booster1.id,
          estimatedTime: '2-4 дня',
          features: JSON.stringify([
            'Безопасно',
            'Быстро',
            'Гарантия возврата',
            'Без ботов',
            'Отчёты о прогрессе',
          ]),
          requirements: JSON.stringify([
            'Доступ к аккаунту',
            'Минимум 500 трофеев',
          ]),
          active: true,
          ordersCount: 47,
          rating: 4.9,
          reviewsCount: 12,
        },
      }),
      db.service.create({
        data: {
          title: 'Буст трофеев до 10000',
          description:
            'Профессиональный буст трофеев до 10000. Наш лучший бустер доведёт ваш аккаунт до 10000 трофеев с гарантией качества. Подходит для опытных игроков, желающих попасть в топ.',
          price: 2500,
          image: null,
          categoryId: trophyCat.id,
          boosterId: booster1.id,
          estimatedTime: '5-7 дней',
          features: JSON.stringify([
            'Безопасно',
            'Быстро',
            'Гарантия возврата',
            'Без ботов',
            'Ежедневные отчёты',
            'Приоритетная поддержка',
          ]),
          requirements: JSON.stringify([
            'Доступ к аккаунту',
            'Минимум 3000 трофеев',
            '15+ бойцов',
          ]),
          active: true,
          ordersCount: 23,
          rating: 4.7,
          reviewsCount: 8,
        },
      }),
      db.service.create({
        data: {
          title: 'Получение Леона',
          description:
            'Получите легендарного бойца Леона! Наш бустер откроет Леона через trophies или другие доступные способы. Леон — один из лучших assassins в игре.',
          price: 800,
          image: null,
          categoryId: brawlerCat.id,
          boosterId: booster1.id,
          estimatedTime: '1-3 дня',
          features: JSON.stringify([
            'Безопасно',
            'Быстро',
            'Гарантия получения',
            'Гарантия возврата',
          ]),
          requirements: JSON.stringify([
            'Доступ к аккаунту',
            '3000+ трофеев',
          ]),
          active: true,
          ordersCount: 35,
          rating: 4.8,
          reviewsCount: 10,
        },
      }),
      db.service.create({
        data: {
          title: 'Получение Кроу',
          description:
            'Получите легендарного Кроу! Один из самых мобильных бойцов в Brawl Stars. Наш бустер обеспечит быстрое получение этого персонажа.',
          price: 900,
          image: null,
          categoryId: brawlerCat.id,
          boosterId: booster2.id,
          estimatedTime: '1-3 дня',
          features: JSON.stringify([
            'Безопасно',
            'Быстро',
            'Гарантия получения',
            'Гарантия возврата',
            'Поддержка 24/7',
          ]),
          requirements: JSON.stringify([
            'Доступ к аккаунту',
            '4000+ трофеев',
          ]),
          active: true,
          ordersCount: 28,
          rating: 4.6,
          reviewsCount: 9,
        },
      }),
      db.service.create({
        data: {
          title: 'Выполнение квестов сезона',
          description:
            'Полное выполнение всех квестов текущего сезона. Получите все награды сезона без лишних усилий! Подходит для игроков, у которых нет времени на ежедневное выполнение заданий.',
          price: 600,
          image: null,
          categoryId: questCat.id,
          boosterId: booster2.id,
          estimatedTime: '3-5 дней',
          features: JSON.stringify([
            'Безопасно',
            'Все квесты сезона',
            'Гарантия возврата',
            'Ежедневные отчёты',
          ]),
          requirements: JSON.stringify([
            'Доступ к аккаунту',
            'Бравл Пасс (опционально)',
          ]),
          active: true,
          ordersCount: 52,
          rating: 4.5,
          reviewsCount: 14,
        },
      }),
      db.service.create({
        data: {
          title: 'Буст до Мастера',
          description:
            'Доведём ваш ранг до Мастера! Максимальный ранг в Brawl Stars с гарантией. Топовый бустер сыграет за вас в рейтинговых боях до достижения ранга Мастер.',
          price: 3500,
          image: null,
          categoryId: rankCat.id,
          boosterId: booster1.id,
          estimatedTime: '7-14 дней',
          features: JSON.stringify([
            'Безопасно',
            'Гарантия ранга Мастер',
            'Гарантия возврата',
            'Приоритетная поддержка',
            'Ежедневные отчёты',
            'Без ботов',
          ]),
          requirements: JSON.stringify([
            'Доступ к аккаунту',
            '5000+ трофеев',
            '20+ бойцов',
            'Ранг минимум Алмаз',
          ]),
          active: true,
          ordersCount: 15,
          rating: 4.9,
          reviewsCount: 6,
        },
      }),
      db.service.create({
        data: {
          title: 'Прокачка бойца до 11 уровня',
          description:
            'Прокачаем любого бойца до 11 уровня с полным оснащением усилителями силы. Максимальная эффективность вашего любимого персонажа!',
          price: 500,
          image: null,
          categoryId: brawlerCat.id,
          boosterId: booster2.id,
          estimatedTime: '1-2 дня',
          features: JSON.stringify([
            'Безопасно',
            'Быстро',
            'Гарантия результата',
            'Гарантия возврата',
          ]),
          requirements: JSON.stringify([
            'Доступ к аккаунту',
            'Боец минимум 7 уровня',
          ]),
          active: true,
          ordersCount: 41,
          rating: 4.4,
          reviewsCount: 11,
        },
      }),
      db.service.create({
        data: {
          title: 'Получение Сандры',
          description:
            'Получите хроматического бойца Сандр! Отличный боец для контроля поля боя. Наш бустер быстро добавит Сандру в вашу коллекцию.',
          price: 750,
          image: null,
          categoryId: brawlerCat.id,
          boosterId: booster1.id,
          estimatedTime: '2-4 дня',
          features: JSON.stringify([
            'Безопасно',
            'Быстро',
            'Гарантия получения',
            'Гарантия возврата',
          ]),
          requirements: JSON.stringify([
            'Доступ к аккаунту',
            '3500+ трофеев',
          ]),
          active: true,
          ordersCount: 19,
          rating: 4.3,
          reviewsCount: 5,
        },
      }),
      db.service.create({
        data: {
          title: 'Квесты Бравл Пасса',
          description:
            'Выполнение всех квестов Бравл Пасса! Получите максимальные награды из проходки без ежедневного гринда. Подходит для занятых игроков.',
          price: 450,
          image: null,
          categoryId: questCat.id,
          boosterId: booster2.id,
          estimatedTime: '2-4 дня',
          features: JSON.stringify([
            'Безопасно',
            'Все квесты Бравл Пасса',
            'Гарантия возврата',
            'Отчёты о прогрессе',
          ]),
          requirements: JSON.stringify([
            'Доступ к аккаунту',
            'Активный Бравл Пасс',
          ]),
          active: true,
          ordersCount: 38,
          rating: 4.6,
          reviewsCount: 10,
        },
      }),
    ])

    // ─── Create Orders ─────────────────────────────────────────────────
    const order1 = await db.order.create({
      data: {
        serviceId: services[0].id, // Буст трофеев до 5000
        clientId: client1.id,
        boosterId: booster1.id,
        status: 'completed',
        progress: 100,
        price: 1200,
        escrowLocked: false,
        clientNotes: 'Хочу чтобы всё было максимально быстро',
        boosterNotes: 'Выполнено за 2 дня',
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    })

    const order2 = await db.order.create({
      data: {
        serviceId: services[2].id, // Получение Леона
        clientId: client2.id,
        boosterId: booster1.id,
        status: 'in_progress',
        progress: 65,
        price: 800,
        escrowLocked: true,
        clientNotes: 'Очень хочу Леона, уже давно пытаюсь получить',
        boosterNotes: 'В процессе, осталось немного',
      },
    })

    const order3 = await db.order.create({
      data: {
        serviceId: services[5].id, // Буст до Мастера
        clientId: client1.id,
        boosterId: booster1.id,
        status: 'in_progress',
        progress: 30,
        price: 3500,
        escrowLocked: true,
        clientNotes: 'Мой текущий ранг Алмаз 3',
        boosterNotes: 'Начали, progressing steadily',
      },
    })

    const order4 = await db.order.create({
      data: {
        serviceId: services[4].id, // Выполнение квестов сезона
        clientId: client2.id,
        boosterId: booster2.id,
        status: 'pending',
        progress: 0,
        price: 600,
        escrowLocked: true,
        clientNotes: 'Нужно выполнить все квесты этого сезона',
      },
    })

    const order5 = await db.order.create({
      data: {
        serviceId: services[3].id, // Получение Кроу
        clientId: client1.id,
        boosterId: booster2.id,
        status: 'disputed',
        progress: 40,
        price: 900,
        escrowLocked: true,
        clientNotes: 'Нужен Кроу ASAP',
        boosterNotes: 'Была проблема с доступом к аккаунту',
      },
    })

    const order6 = await db.order.create({
      data: {
        serviceId: services[6].id, // Прокачка бойца до 11 уровня
        clientId: client2.id,
        boosterId: booster2.id,
        status: 'completed',
        progress: 100,
        price: 500,
        escrowLocked: false,
        clientNotes: 'Прокачайте Шелли до 11 уровня',
        boosterNotes: 'Выполнено, бойца прокачан до 11 уровня',
        completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    })

    // ─── Create Reviews ────────────────────────────────────────────────
    await Promise.all([
      db.review.create({
        data: {
          orderId: order1.id,
          serviceId: services[0].id,
          authorId: client1.id,
          targetId: booster1.id,
          rating: 5,
          comment:
            'Отличный бустер! Всё сделал быстро и качественно. Трофеи набраны за 2 дня, как и обещал. Рекомендую!',
        },
      }),
      db.review.create({
        data: {
          orderId: order6.id,
          serviceId: services[6].id,
          authorId: client2.id,
          targetId: booster2.id,
          rating: 4,
          comment:
            'Хороший бустер, бойца прокачали до 11 уровня. Немного задержали сроки, но результат отличный.',
        },
      }),
      db.review.create({
        data: {
          orderId: order1.id,
          serviceId: services[0].id,
          authorId: client1.id,
          targetId: booster1.id,
          rating: 5,
          comment:
            'Второй заказ у этого бустера — снова всё на высшем уровне! Буду обращаться ещё.',
        },
      }),
      db.review.create({
        data: {
          orderId: order6.id,
          serviceId: services[6].id,
          authorId: client2.id,
          targetId: booster2.id,
          rating: 5,
          comment:
            'Всё супер, Шелли теперь 11 уровня с полным набором усилителей!',
        },
      }),
      db.review.create({
        data: {
          orderId: order1.id,
          serviceId: services[0].id,
          authorId: client1.id,
          targetId: booster1.id,
          rating: 4,
          comment:
            'Хороший сервис, но хотелось бы чуть больше отчётов о прогрессе. В целом доволен.',
        },
      }),
    ])

    // ─── Create Chat Messages ──────────────────────────────────────────
    await Promise.all([
      db.chatMessage.create({
        data: {
          orderId: order2.id,
          senderId: client2.id,
          content: 'Привет! Когда начнёте работать над получением Леона?',
          read: true,
        },
      }),
      db.chatMessage.create({
        data: {
          orderId: order2.id,
          senderId: booster1.id,
          content:
            'Привет! Уже начал работу, прогресс идёт хорошо. Осталось совсем немного!',
          read: true,
        },
      }),
      db.chatMessage.create({
        data: {
          orderId: order2.id,
          senderId: client2.id,
          content: 'Отлично, спасибо! Буду ждать',
          read: true,
        },
      }),
      db.chatMessage.create({
        data: {
          orderId: order3.id,
          senderId: client1.id,
          content: 'Как прогресс по бусту ранга?',
          read: true,
        },
      }),
      db.chatMessage.create({
        data: {
          orderId: order3.id,
          senderId: booster1.id,
          content:
            'Сейчас на 30%, идём по расписанию. Ранг потихоньку растёт.',
          read: false,
        },
      }),
      db.chatMessage.create({
        data: {
          orderId: order5.id,
          senderId: client1.id,
          content:
            'Почему нет прогресса? Уже 3 дня прошло, а Кроу до сих пор нет!',
          read: true,
        },
      }),
      db.chatMessage.create({
        data: {
          orderId: order5.id,
          senderId: booster2.id,
          content:
            'Была проблема с доступом к аккаунту, сейчас всё исправлено. Продолжаю работу.',
          read: true,
        },
      }),
      db.chatMessage.create({
        data: {
          orderId: order5.id,
          senderId: client1.id,
          content: 'Открываю спор, слишком долго.',
          read: false,
        },
      }),
    ])

    // ─── Create Notifications ──────────────────────────────────────────
    await Promise.all([
      db.notification.create({
        data: {
          userId: client1.id,
          title: 'Заказ выполнен',
          message: 'Ваш заказ "Буст трофеев до 5000" успешно выполнен!',
          type: 'success',
          read: true,
        },
      }),
      db.notification.create({
        data: {
          userId: client1.id,
          title: 'Обновление заказа',
          message: 'Прогресс заказа "Буст до Мастера" обновлён: 30%',
          type: 'info',
          read: false,
        },
      }),
      db.notification.create({
        data: {
          userId: client1.id,
          title: 'Спор по заказу',
          message:
            'По вашему заказу "Получение Кроу" открыт спор. Модератор рассмотрит его в ближайшее время.',
          type: 'warning',
          read: false,
        },
      }),
      db.notification.create({
        data: {
          userId: client2.id,
          title: 'Заказ в работе',
          message: 'Бустер начал работу над заказом "Получение Леона"',
          type: 'info',
          read: false,
        },
      }),
      db.notification.create({
        data: {
          userId: client2.id,
          title: 'Заказ выполнен',
          message: 'Ваш заказ "Прокачка бойца до 11 уровня" выполнен!',
          type: 'success',
          read: true,
        },
      }),
      db.notification.create({
        data: {
          userId: client2.id,
          title: 'Новый заказ',
          message:
            'Ваш заказ на "Выполнение квестов сезона" создан и ожидает бустера',
          type: 'info',
          read: false,
        },
      }),
      db.notification.create({
        data: {
          userId: booster1.id,
          title: 'Новый заказ',
          message:
            'Поступил новый заказ на услугу "Буст до Мастера"',
          type: 'info',
          read: true,
        },
      }),
      db.notification.create({
        data: {
          userId: booster1.id,
          title: 'Спор по заказу',
          message: 'Открыт спор по заказу клиента BrawlFan2024',
          type: 'warning',
          read: false,
        },
      }),
      db.notification.create({
        data: {
          userId: booster2.id,
          title: 'Новый заказ',
          message:
            'Поступил новый заказ на услугу "Выполнение квестов сезона"',
          type: 'info',
          read: false,
        },
      }),
    ])

    // ─── Create Platform Settings ──────────────────────────────────────
    await db.platformSettings.create({
      data: {
        key: 'commission_rate',
        value: '0.15',
      },
    })
    await db.platformSettings.create({
      data: {
        key: 'min_withdrawal',
        value: '500',
      },
    })

    return NextResponse.json({
      message: 'База данных успешно заполнена демо-данными',
      data: {
        categories: 4,
        users: 6,
        services: services.length,
        orders: 6,
        reviews: 5,
        chatMessages: 8,
        notifications: 9,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Ошибка при заполнении базы данных', details: String(error) },
      { status: 500 }
    )
  }
}
