import { db } from '@/lib/db'
import { guardAdmin, fail, ok } from '@/lib/api'

export async function POST(request: Request) {
  const { response } = await guardAdmin()
  if (response) return response

  const body = await request.json().catch(() => null)
  const seasonId = String(body?.seasonId ?? '')
  const name = String(body?.name ?? '').trim()
  if (!seasonId) return fail('Не выбран сезон')
  if (!name) return fail('Укажите название команды')

  const exists = await db.team.findFirst({ where: { seasonId, name } })
  if (exists) return fail('Команда с таким названием уже есть в сезоне', 409)

  const count = await db.team.count({ where: { seasonId } })
  const team = await db.team.create({
    data: {
      seasonId,
      name,
      shortName: String(body?.shortName ?? '').trim() || null,
      color: String(body?.color ?? '#D4AF37'),
      logo: String(body?.logo ?? '').trim() || null,
      order: count,
    },
  })
  return ok({ team }, 201)
}
