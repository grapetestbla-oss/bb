import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

const STATUSES = ['new', 'taken', 'done', 'cancelled']

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const admin = await requireAdmin()
    const { id } = await params
    const { status } = await request.json()
    if (!STATUSES.includes(status)) return fail('Некорректный статус заявки')

    const existing = await db.trainingRequest.findUnique({ where: { id }, include: { order: { include: { plan: true } } } })
    if (!existing) return fail('Заявка не найдена', 404)

    const requestRow = await db.trainingRequest.update({
      where: { id },
      data: {
        status,
        takenById: status === 'taken' ? admin.id : existing.takenById,
        takenAt: status === 'taken' ? new Date() : existing.takenAt,
      },
      include: { user: true, takenBy: true, order: { include: { plan: true } } },
    })

    const titles: Record<string, string> = {
      taken: 'Заявку на обучение взяли в работу',
      done: 'Обучение завершено',
      cancelled: 'Заявка на обучение отменена',
      new: 'Заявка на обучение возвращена в очередь',
    }

    await db.notification.create({
      data: {
        userId: requestRow.userId,
        type: 'training',
        title: titles[status],
        body: `Программа «${requestRow.order.plan?.title ?? 'Обучение'}»: ${admin.login} обновил статус заявки.`,
        link: '/profile',
      },
    })

    return ok({ request: requestRow })
  } catch (error) {
    return handleError(error)
  }
}
