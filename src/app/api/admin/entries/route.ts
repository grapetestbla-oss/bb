import { db } from '@/lib/db'
import { guardAdmin, fail, ok } from '@/lib/api'

export async function POST(request: Request) {
  const { response } = await guardAdmin()
  if (response) return response

  const body = await request.json().catch(() => null)
  const seasonId = String(body?.seasonId ?? '')
  const userId = String(body?.userId ?? '')
  if (!seasonId) return fail('Не выбран сезон')
  if (!userId) return fail('Не выбран пользователь')

  const exists = await db.seasonEntry.findFirst({ where: { seasonId, userId } })
  if (exists) return fail('Этот пилот уже заявлен в сезоне', 409)

  const number = Number(body?.number)
  const entry = await db.seasonEntry.create({
    data: {
      seasonId,
      userId,
      teamId: body?.teamId ? String(body.teamId) : null,
      number: Number.isFinite(number) && number > 0 ? Math.floor(number) : null,
      status: String(body?.status ?? 'ACTIVE'),
    },
  })
  return ok({ entry }, 201)
}
