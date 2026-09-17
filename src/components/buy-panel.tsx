'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { PaymentPicker } from '@/components/payment-picker'
import type { PaymentProvider } from '@/lib/payments'

export function BuyPanel({
  kind,
  item,
  owned,
  authorized,
  providers,
  manualInstructions,
}: {
  kind: 'setup' | 'pack'
  item: { id: string; title: string; price: number; oldPrice: number | null }
  owned: boolean
  authorized: boolean
  providers: PaymentProvider[]
  manualInstructions: string
}) {
  const router = useRouter()
  const [provider, setProvider] = useState<PaymentProvider>(providers[0] || 'manual')
  const [loading, setLoading] = useState(false)

  const buy = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          ...(kind === 'pack' ? { packId: item.id } : { setupId: item.id }),
          provider,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось создать заказ')

      if (data.payUrl) {
        toast.success('Переходим к оплате…')
        window.location.href = data.payUrl
        return
      }
      toast.success('Заказ создан', {
        description: data.message || 'Администратор подтвердит оплату вручную.',
      })
      router.push('/profile')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка оформления')
    } finally {
      setLoading(false)
    }
  }

  if (owned) {
    return (
      <div className="border border-white/20 p-6 text-center">
        <p className="f1-eyebrow text-white">Уже ваш</p>
        <p className="mt-3 text-sm text-white/60">
          Все параметры открыты на этой странице и в личном кабинете.
        </p>
        <Link
          href="/profile"
          className="f1-eyebrow mt-5 inline-block border border-white/25 px-6 py-3 text-white transition-colors hover:bg-white hover:text-black"
        >
          Мои покупки
        </Link>
      </div>
    )
  }

  return (
    <div className="border border-white/15 p-6">
      <div className="flex items-baseline gap-3">
        <span className="f1-title text-3xl text-white">{item.price.toFixed(0)} ₽</span>
        {item.oldPrice ? (
          <span className="text-white/35 line-through">{item.oldPrice.toFixed(0)} ₽</span>
        ) : null}
      </div>

      {authorized ? (
        <>
          <div className="mt-6">
            <PaymentPicker
              providers={providers}
              value={provider}
              onChange={setProvider}
              manualInstructions={manualInstructions}
            />
          </div>
          <button
            type="button"
            onClick={buy}
            disabled={loading}
            className="f1-eyebrow mt-6 flex w-full items-center justify-center gap-2 bg-white px-6 py-4 text-black transition-opacity hover:opacity-85 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {kind === 'pack' ? 'Купить пак' : 'Купить сетап'}
          </button>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-white/60">
            Покупки хранятся в личном кабинете — войдите или создайте аккаунт.
          </p>
          <Link
            href="/register"
            className="f1-eyebrow mt-5 block bg-white px-6 py-4 text-center text-black transition-opacity hover:opacity-85"
          >
            Создать аккаунт
          </Link>
          <Link
            href="/login"
            className="f1-eyebrow mt-2 block border border-white/25 px-6 py-4 text-center text-white transition-colors hover:bg-white hover:text-black"
          >
            У меня есть аккаунт
          </Link>
        </>
      )}
    </div>
  )
}
