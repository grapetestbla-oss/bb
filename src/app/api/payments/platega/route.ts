import { db } from '@/lib/db'
import { getPaymentSettings } from '@/lib/settings'
import { markOrderPaid } from '@/lib/orders'

/** Callback Platega (webhook о статусе транзакции). */
export async function POST(request: Request) {
  try {
    const cfg = (await getPaymentSettings()).platega
    if (!cfg.enabled || !cfg.merchantId) {
      return new Response('disabled', { status: 400 })
    }

    const secret = request.headers.get('x-secret') || request.headers.get('X-Secret')
    const merchantId = request.headers.get('x-merchantid') || request.headers.get('X-MerchantId')
    if (secret !== cfg.secret || (merchantId && merchantId !== cfg.merchantId)) {
      return new Response('unauthorized', { status: 401 })
    }

    const body = (await request.json()) as {
      paymentId?: string
      id?: string
      payload?: string
      status?: string
    }
    const orderId = body.payload || body.paymentId || body.id
    if (!orderId) return new Response('no order', { status: 400 })

    const status = String(body.status || '').toUpperCase()
    if (status === 'CONFIRMED' || status === 'SUCCESS' || status === 'PAID') {
      await markOrderPaid(orderId, 'platega')
    } else if (status === 'CANCELED' || status === 'CANCELLED' || status === 'FAILED') {
      await db.order.updateMany({ where: { id: orderId, status: 'pending' }, data: { status: 'cancelled' } })
    }

    return new Response('OK')
  } catch (error) {
    console.error(error)
    return new Response('error', { status: 500 })
  }
}
