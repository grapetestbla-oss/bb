import crypto from 'crypto'
import { getPaymentSettings, type PaymentSettings } from '@/lib/settings'

export type PaymentProvider = 'freekassa' | 'platega' | 'manual'

export type PaymentResult = {
  provider: PaymentProvider
  payUrl: string | null
  externalId: string | null
  message?: string
}

function md5(input: string) {
  return crypto.createHash('md5').update(input).digest('hex')
}

export function freekassaSign(
  merchantId: string,
  amount: number,
  secret1: string,
  currency: string,
  orderId: string
) {
  return md5([merchantId, amount.toFixed(2), secret1, currency, orderId].join(':'))
}

export function freekassaCallbackSign(
  merchantId: string,
  amount: string,
  secret2: string,
  orderId: string
) {
  return md5([merchantId, amount, secret2, orderId].join(':'))
}

function buildFreekassaUrl(cfg: PaymentSettings['freekassa'], orderId: string, amount: number, email: string) {
  const params = new URLSearchParams({
    m: cfg.merchantId,
    oa: amount.toFixed(2),
    o: orderId,
    currency: cfg.currency,
    em: email,
    s: freekassaSign(cfg.merchantId, amount, cfg.secret1, cfg.currency, orderId),
  })
  return `https://pay.freekassa.ru/?${params.toString()}`
}

async function createPlategaPayment(
  cfg: PaymentSettings['platega'],
  orderId: string,
  amount: number,
  description: string,
  baseUrl: string
): Promise<PaymentResult> {
  const response = await fetch('https://app.platega.io/transaction/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-MerchantId': cfg.merchantId,
      'X-Secret': cfg.secret,
    },
    body: JSON.stringify({
      paymentMethod: cfg.paymentMethod,
      id: orderId,
      paymentDetails: { amount: Number(amount.toFixed(2)), currency: cfg.currency },
      description,
      return: `${baseUrl}/profile?paid=${orderId}`,
      failedUrl: `${baseUrl}/profile?failed=${orderId}`,
      payload: orderId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Platega: ошибка создания платежа (${response.status})`)
  }

  const data = (await response.json()) as { redirect?: string; paymentUrl?: string; id?: string }
  return {
    provider: 'platega',
    payUrl: data.redirect || data.paymentUrl || null,
    externalId: data.id || orderId,
  }
}

export async function createPayment(options: {
  provider: PaymentProvider
  orderId: string
  amount: number
  email: string
  description: string
  baseUrl: string
}): Promise<PaymentResult> {
  const settings = await getPaymentSettings()

  if (options.provider === 'freekassa') {
    const cfg = settings.freekassa
    if (!cfg.enabled || !cfg.merchantId || !cfg.secret1) {
      throw new Error('FreeKassa не подключена в панели администратора')
    }
    return {
      provider: 'freekassa',
      payUrl: buildFreekassaUrl(cfg, options.orderId, options.amount, options.email),
      externalId: options.orderId,
    }
  }

  if (options.provider === 'platega') {
    const cfg = settings.platega
    if (!cfg.enabled || !cfg.merchantId || !cfg.secret) {
      throw new Error('Platega не подключена в панели администратора')
    }
    return createPlategaPayment(cfg, options.orderId, options.amount, options.description, options.baseUrl)
  }

  if (!settings.manual.enabled) {
    throw new Error('Ручная оплата отключена')
  }

  return {
    provider: 'manual',
    payUrl: null,
    externalId: null,
    message: settings.manual.instructions,
  }
}

export async function availableProviders(): Promise<PaymentProvider[]> {
  const settings = await getPaymentSettings()
  const list: PaymentProvider[] = []
  if (settings.freekassa.enabled && settings.freekassa.merchantId && settings.freekassa.secret1) {
    list.push('freekassa')
  }
  if (settings.platega.enabled && settings.platega.merchantId && settings.platega.secret) {
    list.push('platega')
  }
  if (settings.manual.enabled) list.push('manual')
  return list
}
