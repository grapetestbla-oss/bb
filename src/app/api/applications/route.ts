import { db } from '@/lib/db'
import { guardUser, fail, ok } from '@/lib/api'

export async function GET() {
  const { user, response } = await guardUser()
  if (response) return response

  const applications = await db.application.findMany({
    where: { userId: user.id },
    include: { season: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return ok({ applications })
}

export async function POST(request: Request) {
  const { user, response } = await guardUser()
  if (response) return response

  const body = await request.json().catch(() => null)
  if (!body) return fail('Некорректный запрос')

  const gameNick = String(body.gameNick ?? '').trim()
  const platform = String(body.platform ?? '').trim()
  if (!gameNick) return fail('Укажите игровой никнейм')
  if (!platform) return fail('Укажите платформу')

  const season =
    (body.seasonId && (await db.season.findUnique({ where: { id: String(body.seasonId) } }))) ||
    (await db.season.findFirst({ where: { isCurrent: true } })) ||
    (await db.season.findFirst({ orderBy: { createdAt: 'desc' } }))

  if (season && !season.applicationsOpen) return fail('Приём заявок в этот сезон закрыт', 403)

  const pending = await db.application.findFirst({
    where: { userId: user.id, status: 'PENDING' },
  })
  if (pending) return fail('У вас уже есть заявка на рассмотрении', 409)

  if (season) {
    const entry = await db.seasonEntry.findFirst({ where: { userId: user.id, seasonId: season.id } })
    if (entry) return fail('Вы уже участвуете в текущем сезоне', 409)
  }

  const age = Number(body.age)

  const application = await db.application.create({
    data: {
      userId: user.id,
      seasonId: season?.id ?? null,
      gameNick,
      platform,
      psnId: String(body.psnId ?? '').trim() || null,
      age: Number.isFinite(age) && age > 0 ? Math.floor(age) : null,
      experience: String(body.experience ?? '').trim() || null,
      availability: String(body.availability ?? '').trim() || null,
      about: String(body.about ?? '').trim() || null,
      preferredTeam: String(body.preferredTeam ?? '').trim() || null,
    },
  })

  await db.user.update({
    where: { id: user.id },
    data: { gameNick, platform },
  })

  return ok({ application }, 201)
}
