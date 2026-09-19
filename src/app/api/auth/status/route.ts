import { db } from '@/lib/db'
import { handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** Есть ли у магазина владелец: пока нет — первая регистрация получит админку. */
export async function GET() {
  try {
    // Скрытые служебные аккаунты (root) не считаются владельцем
    const users = await db.user.count({ where: { hidden: false } })
    return ok({ needsOwner: users === 0 })
  } catch (error) {
    return handleError(error)
  }
}
