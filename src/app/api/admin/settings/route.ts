import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api'
import {
  DEFAULT_PAYMENTS,
  DEFAULT_SITE,
  getPaymentSettings,
  getSetting,
  setSetting,
  type SiteSettings,
} from '@/lib/settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
    const [payments, site] = await Promise.all([
      getPaymentSettings(),
      getSetting<SiteSettings>('site', DEFAULT_SITE),
    ])
    return ok({ payments, site })
  } catch (error) {
    return handleError(error)
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin()
    const body = await request.json()

    if (body.payments) {
      const current = await getPaymentSettings()
      const next = {
        freekassa: { ...DEFAULT_PAYMENTS.freekassa, ...current.freekassa, ...body.payments.freekassa },
        platega: { ...DEFAULT_PAYMENTS.platega, ...current.platega, ...body.payments.platega },
        manual: { ...DEFAULT_PAYMENTS.manual, ...current.manual, ...body.payments.manual },
      }
      next.platega.paymentMethod = Number(next.platega.paymentMethod) || 2
      await setSetting('payments', next)
    }

    if (body.site) {
      const current = await getSetting<SiteSettings>('site', DEFAULT_SITE)
      await setSetting('site', { ...current, ...body.site })
    }

    const [payments, site] = await Promise.all([
      getPaymentSettings(),
      getSetting<SiteSettings>('site', DEFAULT_SITE),
    ])
    return ok({ payments, site })
  } catch (error) {
    return handleError(error)
  }
}
