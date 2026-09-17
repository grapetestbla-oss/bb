import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'
import { createPayment, type PaymentProvider } from '@/lib/payments'
import { CONTACT_TYPES, DEVICES, PLATFORMS } from '@/lib/f1-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireUser()
    const orders = await db.order.findMany({
      where: { userId: user.id },
      include: {
        setup: { include: { track: true, pilot: true, variants: { orderBy: { order: 'asc' } } } },
        packSet: { include: { pilot: true, setups: { include: { setup: { include: { track: true } } } } } },
        plan: true,
        training: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    return ok({ orders })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser()
    const body = await request.json()
    const kind: 'setup' | 'pack' | 'training' =
      body.kind === 'training' ? 'training' : body.kind === 'pack' ? 'pack' : 'setup'
    const provider = (body.provider || 'manual') as PaymentProvider

    let amount = 0
    let description = ''
    let setupId: string | null = null
    let packId: string | null = null
    let planId: string | null = null

    if (kind === 'pack') {
      const pack = await db.pack.findUnique({
        where: { id: String(body.packId) },
        include: { pilot: true },
      })
      if (!pack || !pack.active) return fail('Пак не найден', 404)

      const already = await db.order.findFirst({
        where: { userId: user.id, packId: pack.id, status: 'paid' },
      })
      if (already) return fail('Этот пак уже куплен — он доступен в профиле', 409)

      packId = pack.id
      amount = pack.price
      description = `Пак «${pack.title}» — ${pack.pilot.name}`
    } else if (kind === 'setup') {
      const setup = await db.setup.findUnique({
        where: { id: String(body.setupId) },
        include: { track: true, pilot: true },
      })
      if (!setup || !setup.active) return fail('Сетап не найден', 404)

      const already = await db.order.findFirst({
        where: { userId: user.id, setupId: setup.id, status: 'paid' },
      })
      if (already) return fail('Этот сетап уже куплен — он доступен в профиле', 409)

      setupId = setup.id
      amount = setup.price
      description = `Сетап «${setup.track.name}» — ${setup.pilot.name}`
    } else {
      const plan = await db.trainingPlan.findUnique({ where: { id: String(body.planId) } })
      if (!plan || !plan.active) return fail('Программа обучения не найдена', 404)

      const form = body.form || {}
      if (!form.contact) return fail('Укажите контакт для связи')
      if (!CONTACT_TYPES.some((c) => c.value === form.contactType)) return fail('Выберите способ связи')
      if (!PLATFORMS.some((p) => p.value === form.platform)) return fail('Выберите платформу')
      if (!DEVICES.some((d) => d.value === form.device)) return fail('Выберите устройство управления')

      planId = plan.id
      amount = plan.price
      description = `Обучение «${plan.title}»`
    }

    const order = await db.order.create({
      data: { userId: user.id, kind, setupId, packId, planId, amount, status: 'pending', provider },
    })

    if (kind === 'training') {
      const form = body.form
      await db.trainingRequest.create({
        data: {
          orderId: order.id,
          userId: user.id,
          contactType: String(form.contactType),
          contact: String(form.contact),
          platform: String(form.platform),
          device: String(form.device),
          level: String(form.level || ''),
          comment: String(form.comment || ''),
        },
      })
      await db.notification.create({
        data: {
          userId: null,
          type: 'training',
          title: 'Новая заявка на обучение',
          body: `${user.login} оставил заявку: ${description}. Ожидает оплаты.`,
          link: '/admin?tab=training',
        },
      })
    }

    const origin = new URL(request.url).origin
    const payment = await createPayment({
      provider,
      orderId: order.id,
      amount,
      email: user.email,
      description,
      baseUrl: origin,
    })

    const updated = await db.order.update({
      where: { id: order.id },
      data: { provider: payment.provider, payUrl: payment.payUrl, externalId: payment.externalId },
    })

    if (payment.provider === 'manual') {
      await db.notification.create({
        data: {
          userId: null,
          type: 'order',
          title: 'Заказ ожидает подтверждения оплаты',
          body: `${user.login} — ${description} (${amount.toFixed(0)} ₽)`,
          link: '/admin?tab=orders',
        },
      })
    }

    return ok({ order: updated, payUrl: payment.payUrl, message: payment.message })
  } catch (error) {
    return handleError(error)
  }
}
