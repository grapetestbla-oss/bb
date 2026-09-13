import { handleError, ok } from '@/lib/api'
import { availableProviders } from '@/lib/payments'
import { getPaymentSettings, maskPayments } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await getPaymentSettings()
    return ok({ providers: await availableProviders(), payments: maskPayments(settings) })
  } catch (error) {
    return handleError(error)
  }
}
