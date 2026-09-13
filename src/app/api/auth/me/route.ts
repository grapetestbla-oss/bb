import { getCurrentUser } from '@/lib/auth'
import { handleError, ok } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return ok({ user: await getCurrentUser() })
  } catch (error) {
    return handleError(error)
  }
}
