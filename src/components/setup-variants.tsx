'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { CONDITIONS, SETUP_FIELDS, conditionLabel, type SetupData } from '@/lib/f1-data'
import { cn } from '@/lib/utils'

export type VariantView = {
  id: string
  condition: string
  title: string
  notes: string
  data: Partial<SetupData> | null
}

/** Варианты одного сетапа: сухо и дождь. Значения скрыты до покупки. */
export function SetupVariants({
  variants,
  preview,
  owned,
}: {
  variants: VariantView[]
  preview: Partial<SetupData>
  owned: boolean
}) {
  const [active, setActive] = useState(variants[0]?.id ?? '')
  const current = variants.find((v) => v.id === active) ?? variants[0]
  if (!current) return null

  const values = owned ? current.data ?? {} : preview
  const groups = Array.from(new Set(SETUP_FIELDS.map((f) => f.group)))

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => setActive(variant.id)}
            className={cn(
              'f1-eyebrow border border-white/15 px-5 py-3 text-white/60 transition-colors',
              variant.id === current.id && 'border-white bg-white text-black'
            )}
          >
            {variant.title || conditionLabel(variant.condition)}
          </button>
        ))}
      </div>

      {current.notes && <p className="mt-4 text-sm text-white/55">{current.notes}</p>}

      <div className="mt-6 border border-white/10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group} className="border-b border-r border-white/10 pb-2">
              <h4 className="f1-eyebrow px-5 py-3 text-white/45">{group}</h4>
              {SETUP_FIELDS.filter((f) => f.group === group).map((field) => {
                const value = values?.[field.key]
                const has = value !== undefined && value !== null
                return (
                  <div key={field.key} className="flex items-baseline justify-between gap-3 px-5 py-1.5 text-sm">
                    <span className="text-white/65">{field.label}</span>
                    {has ? (
                      <span className="tabular-nums text-white">
                        {String(value)}
                        {field.unit ? ` ${field.unit}` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-white/25">
                        <Lock className="h-3 w-3" /> ••
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {!owned && (
        <p className="mt-4 text-center text-sm text-white/45">
          Открыты {Object.keys(preview).length} параметра из {SETUP_FIELDS.length} ·{' '}
          {CONDITIONS.length} варианта откроются после оплаты
        </p>
      )}
    </div>
  )
}
