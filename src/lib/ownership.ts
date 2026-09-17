import { db } from '@/lib/db'

/**
 * Сетап считается купленным, если оплачен он сам
 * или оплачен пак, в который он входит.
 */
export async function getOwnedSetupIds(userId: string | null | undefined): Promise<Set<string>> {
  if (!userId) return new Set()

  const orders = await db.order.findMany({
    where: { userId, status: 'paid' },
    select: {
      setupId: true,
      packSet: { select: { setups: { select: { setupId: true } } } },
    },
  })

  const owned = new Set<string>()
  for (const order of orders) {
    if (order.setupId) owned.add(order.setupId)
    for (const item of order.packSet?.setups ?? []) owned.add(item.setupId)
  }
  return owned
}

export async function ownsSetup(userId: string | null | undefined, setupId: string) {
  if (!userId) return false
  return (await getOwnedSetupIds(userId)).has(setupId)
}

export async function ownsPack(userId: string | null | undefined, packId: string) {
  if (!userId) return false
  const order = await db.order.findFirst({ where: { userId, packId, status: 'paid' } })
  return Boolean(order)
}
