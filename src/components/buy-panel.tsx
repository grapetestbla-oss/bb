'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, CreditCard, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PaymentPicker } from '@/components/payment-picker'
import type { PaymentProvider } from '@/lib/payments'

export function BuyPanel({
  setup,
  owned,
  authorized,
  providers,
  manualInstructions,
}: {
  setup: { id: string; title: string; price: number; oldPrice: number | null }
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
        body: JSON.stringify({ kind: 'setup', setupId: setup.id, provider }),
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
      <Card className="border-emerald-500/40 bg-emerald-500/5 p-6">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-bold uppercase">Сетап уже ваш</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Полные параметры открыты на этой странице и в личном кабинете.
        </p>
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link href="/profile">Мои покупки</Link>
        </Button>
      </Card>
    )
  }

  return (
    <Card className="border-border/70 bg-card/80 p-6">
      <div className="flex items-baseline gap-3">
        <span className="f1-title text-4xl">{setup.price.toFixed(0)} ₽</span>
        {setup.oldPrice ? (
          <span className="text-lg text-muted-foreground line-through">{setup.oldPrice.toFixed(0)} ₽</span>
        ) : null}
      </div>

      {authorized ? (
        <>
          <div className="mt-5">
            <PaymentPicker
              providers={providers}
              value={provider}
              onChange={setProvider}
              manualInstructions={manualInstructions}
            />
          </div>
          <Button
            onClick={buy}
            disabled={loading}
            size="lg"
            className="mt-5 w-full bg-[#e10600] hover:bg-[#ff1a12]"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
            Купить сетап
          </Button>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            Чтобы купить сетап, войдите в аккаунт или зарегистрируйтесь — покупки хранятся в личном
            кабинете.
          </p>
          <Button asChild size="lg" className="mt-4 w-full bg-[#e10600] hover:bg-[#ff1a12]">
            <Link href="/register">Создать аккаунт</Link>
          </Button>
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link href="/login">У меня есть аккаунт</Link>
          </Button>
        </>
      )}
    </Card>
  )
}
