import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { fail, handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return ok({ notifications: [], unread: 0 })
    const scope = new URL(request.url).searchParams.get('scope')
    const admin = scope === 'admin' && user.role === 'admin'

    const where = admin ? { userId: null } : { userId: user.id }
    const [notifications, unread] = await Promise.all([
      db.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 }),
      db.notification.count({ where: { ...where, read: false } }),
    ])
    return ok({ notifications, unread })
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return fail('Требуется авторизация', 401)
    const { id, scope } = await request.json()
    const admin = scope === 'admin' && user.role === 'admin'
    const where = admin ? { userId: null } : { userId: user.id }
    if (id) {
      await db.notification.updateMany({ where: { ...where, id: String(id) }, data: { read: true } })
    } else {
      await db.notification.updateMany({ where, data: { read: true } })
    }
    return ok({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
