import { freekassaCallbackSign } from '@/lib/payments'
import { getPaymentSettings } from '@/lib/settings'
import { markOrderPaid } from '@/lib/orders'

/** Callback FreeKassa (уведомление об оплате). */
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const merchantId = String(form.get('MERCHANT_ID') || '')
    const amount = String(form.get('AMOUNT') || '')
    const orderId = String(form.get('MERCHANT_ORDER_ID') || '')
    const sign = String(form.get('SIGN') || '').toLowerCase()

    const cfg = (await getPaymentSettings()).freekassa
    if (!cfg.enabled || !cfg.merchantId || merchantId !== cfg.merchantId) {
      return new Response('wrong merchant', { status: 400 })
    }

    const expected = freekassaCallbackSign(cfg.merchantId, amount, cfg.secret2, orderId)
    if (expected !== sign) return new Response('wrong sign', { status: 400 })

    await markOrderPaid(orderId, 'freekassa')
    return new Response('YES')
  } catch (error) {
    console.error(error)
    return new Response('error', { status: 500 })
  }
}
