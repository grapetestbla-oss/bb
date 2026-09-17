import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { parseJson } from '@/lib/api'
import { ProfileView } from '@/components/profile-view'
import type { SetupData } from '@/lib/f1-data'

export const metadata = { title: 'Личный кабинет — FANTASTIQUEBOY SETUPS' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [orders, notifications] = await Promise.all([
    db.order.findMany({
      where: { userId: user.id },
      include: { setup: { include: { track: true } }, plan: true, training: true },
      orderBy: { createdAt: 'desc' },
    }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ])

  return (
    <ProfileView
      user={user}
      orders={orders.map((order) => ({
        id: order.id,
        kind: order.kind,
        amount: order.amount,
        status: order.status,
        provider: order.provider,
        payUrl: order.payUrl,
        createdAt: order.createdAt.toISOString(),
        setup: order.setup
          ? {
              id: order.setup.id,
              title: order.setup.title,
              type: order.setup.type,
              track: { name: order.setup.track.name, flag: order.setup.track.flag },
              data: order.status === 'paid' ? parseJson<Partial<SetupData>>(order.setup.data, {}) : null,
            }
          : null,
        plan: order.plan ? { title: order.plan.title, duration: order.plan.duration } : null,
        training: order.training
          ? {
              status: order.training.status,
              platform: order.training.platform,
              device: order.training.device,
              contact: order.training.contact,
              contactType: order.training.contactType,
            }
          : null,
      }))}
      notifications={notifications.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  )
}
