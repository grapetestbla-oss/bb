import { db } from '@/lib/db'

/** Помечает заказ оплаченным и создаёт уведомления. Идемпотентно. */
export async function markOrderPaid(orderId: string, provider?: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { setup: { include: { track: true } }, plan: true, training: true, user: true },
  })
  if (!order) throw new Error('Заказ не найден')
  if (order.status === 'paid') return order

  const updated = await db.order.update({
    where: { id: orderId },
    data: { status: 'paid', paidAt: new Date(), provider: provider || order.provider },
    include: { setup: { include: { track: true } }, plan: true, training: true, user: true },
  })

  if (updated.setupId) {
    await db.setup.update({
      where: { id: updated.setupId },
      data: { sales: { increment: 1 } },
    })
  }

  const label = updated.setup
    ? `${updated.setup.title} — ${updated.setup.track.name}`
    : updated.plan?.title ?? 'Заказ'

  await db.notification.create({
    data: {
      userId: updated.userId,
      type: 'payment',
      title: 'Оплата получена',
      body: `Заказ «${label}» успешно оплачен.`,
      link: '/profile',
    },
  })

  await db.notification.create({
    data: {
      userId: null,
      type: updated.kind === 'training' ? 'training' : 'order',
      title: updated.kind === 'training' ? 'Оплачена заявка на обучение' : 'Новая продажа сетапа',
      body: `${updated.user.login} — «${label}» на сумму ${updated.amount.toFixed(0)} ₽`,
      link: updated.kind === 'training' ? '/admin?tab=training' : '/admin?tab=orders',
    },
  })

  if (updated.training && updated.training.status === 'new') {
    await db.trainingRequest.update({
      where: { id: updated.training.id },
      data: { status: 'new' },
    })
  }

  return updated
}
