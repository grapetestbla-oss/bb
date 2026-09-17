import { db } from '@/lib/db'
import { parseJson } from '@/lib/api'

export type FreekassaConfig = {
  enabled: boolean
  merchantId: string
  secret1: string
  secret2: string
  currency: string
}

export type PlategaConfig = {
  enabled: boolean
  merchantId: string
  secret: string
  paymentMethod: number
  currency: string
}

export type PaymentSettings = {
  freekassa: FreekassaConfig
  platega: PlategaConfig
  manual: { enabled: boolean; instructions: string }
}

export type SiteSettings = {
  title: string
  subtitle: string
  contact: string
}

export const DEFAULT_PAYMENTS: PaymentSettings = {
  freekassa: { enabled: false, merchantId: '', secret1: '', secret2: '', currency: 'RUB' },
  platega: { enabled: false, merchantId: '', secret: '', paymentMethod: 2, currency: 'RUB' },
  manual: {
    enabled: true,
    instructions: 'Оплата подтверждается вручную администратором после связи с вами.',
  },
}

export const DEFAULT_SITE: SiteSettings = {
  title: 'FANTASTIQUEBOY SETUPS',
  subtitle: 'Профессиональные сетапы для F1 25 и 2026 Season Pack',
  contact: '@fantasticqueboy',
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } })
  if (!row) return fallback
  const value = parseJson<Partial<T>>(row.value, {} as Partial<T>)
  return { ...fallback, ...value } as T
}

export async function setSetting(key: string, value: unknown) {
  const raw = JSON.stringify(value)
  return db.setting.upsert({
    where: { key },
    update: { value: raw },
    create: { key, value: raw },
  })
}

export async function getPaymentSettings() {
  const stored = await getSetting<PaymentSettings>('payments', DEFAULT_PAYMENTS)
  return {
    freekassa: { ...DEFAULT_PAYMENTS.freekassa, ...stored.freekassa },
    platega: { ...DEFAULT_PAYMENTS.platega, ...stored.platega },
    manual: { ...DEFAULT_PAYMENTS.manual, ...stored.manual },
  } as PaymentSettings
}

/** Конфиг без секретов — безопасно отдавать на клиент. */
export function maskPayments(settings: PaymentSettings) {
  return {
    freekassa: {
      enabled: settings.freekassa.enabled,
      merchantId: settings.freekassa.merchantId,
      currency: settings.freekassa.currency,
      configured: Boolean(settings.freekassa.merchantId && settings.freekassa.secret1),
    },
    platega: {
      enabled: settings.platega.enabled,
      merchantId: settings.platega.merchantId,
      currency: settings.platega.currency,
      paymentMethod: settings.platega.paymentMethod,
      configured: Boolean(settings.platega.merchantId && settings.platega.secret),
    },
    manual: settings.manual,
  }
}
