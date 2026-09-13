'use client'

import { Banknote, CreditCard, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PaymentProvider } from '@/lib/payments'

const META: Record<PaymentProvider, { label: string; hint: string; icon: typeof Wallet }> = {
  freekassa: { label: 'FreeKassa', hint: 'Карты, СБП, электронные кошельки', icon: CreditCard },
  platega: { label: 'Platega', hint: 'Карты и быстрые платежи', icon: Wallet },
  manual: { label: 'Ручная оплата', hint: 'Подтверждение администратором', icon: Banknote },
}

export function PaymentPicker({
  providers,
  value,
  onChange,
  manualInstructions,
}: {
  providers: PaymentProvider[]
  value: PaymentProvider
  onChange: (value: PaymentProvider) => void
  manualInstructions?: string
}) {
  if (!providers.length) {
    return (
      <p className="rounded border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
        Платёжные системы пока не подключены. Свяжитесь с администратором для оплаты.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Способ оплаты
      </p>
      {providers.map((provider) => {
        const meta = META[provider]
        const Icon = meta.icon
        return (
          <button
            key={provider}
            type="button"
            onClick={() => onChange(provider)}
            className={cn(
              'flex w-full items-center gap-3 rounded-md border border-border/70 px-3 py-2.5 text-left transition-colors hover:border-[#e10600]/60',
              value === provider && 'border-[#e10600] bg-[#e10600]/10'
            )}
          >
            <Icon className="h-4 w-4 text-[#e10600]" />
            <span className="flex-1">
              <span className="block text-sm font-semibold">{meta.label}</span>
              <span className="block text-xs text-muted-foreground">
                {provider === 'manual' && manualInstructions ? manualInstructions : meta.hint}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
