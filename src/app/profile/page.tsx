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
      include: {
        setup: { include: { track: true, pilot: true, variants: { orderBy: { order: 'asc' } } } },
        packSet: { include: { pilot: true, _count: { select: { setups: true } } } },
        plan: true,
        training: true,
      },
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
              pilot: order.setup.pilot.name,
              track: { name: order.setup.track.name, flag: order.setup.track.flag },
              variants: order.setup.variants.map((variant) => ({
                id: variant.id,
                condition: variant.condition,
                title: variant.title,
                notes: variant.notes,
                data:
                  order.status === 'paid' ? parseJson<Partial<SetupData>>(variant.data, {}) : null,
              })),
            }
          : null,
        pack: order.packSet
          ? {
              id: order.packSet.id,
              title: order.packSet.title,
              pilot: order.packSet.pilot.name,
              tracksCount: order.packSet._count.setups,
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
