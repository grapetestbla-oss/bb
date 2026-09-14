import { db } from '@/lib/db'
import { guardAdmin, fail, ok } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

/** Одобрение/отклонение заявки. При одобрении пилот добавляется в сезон. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { user, response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  const body = await request.json().catch(() => null)
  const status = String(body?.status ?? '').toUpperCase()
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) return fail('Недопустимый статус заявки')

  const application = await db.application.findUnique({ where: { id } })
  if (!application) return fail('Заявка не найдена', 404)

  const updated = await db.application.update({
    where: { id },
    data: {
      status,
      adminComment: typeof body?.adminComment === 'string' ? body.adminComment.trim() || null : application.adminComment,
      reviewerId: user.id,
      reviewedAt: new Date(),
    },
  })

  if (status === 'APPROVED') {
    const seasonId =
      (body?.seasonId && String(body.seasonId)) ||
      application.seasonId ||
      (await db.season.findFirst({ where: { isCurrent: true } }))?.id ||
      null

    if (seasonId) {
      const existing = await db.seasonEntry.findFirst({
        where: { seasonId, userId: application.userId },
      })
      const number = Number(body?.number)
      const entryData = {
        teamId: body?.teamId ? String(body.teamId) : existing?.teamId ?? null,
        number: Number.isFinite(number) && number > 0 ? Math.floor(number) : existing?.number ?? null,
        status: 'ACTIVE',
      }

      if (existing) {
        await db.seasonEntry.update({ where: { id: existing.id }, data: entryData })
      } else {
        await db.seasonEntry.create({
          data: { seasonId, userId: application.userId, ...entryData },
        })
      }
    }

    await db.user.update({
      where: { id: application.userId },
      data: { gameNick: application.gameNick, platform: application.platform },
    })
  }

  return ok({ application: updated })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  await db.application.delete({ where: { id } })
  return ok({ success: true })
}
