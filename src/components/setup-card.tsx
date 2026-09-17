'use client'

import Link from 'next/link'
import { packLabel, typeLabel } from '@/lib/f1-data'

export type SetupCardData = {
  id: string
  title: string
  type: string
  pack: string
  price: number
  oldPrice?: number | null
  description: string
  sales: number
  featured?: boolean
  active?: boolean
  owned?: boolean
  track: { name: string; country: string; flag: string; slug: string }
}

/** Карточка в стиле витрины: плитка сверху, подпись по центру снизу. */
export function SetupCard({ setup }: { setup: SetupCardData }) {
  return (
    <Link href={`/setup/${setup.id}`} className="group block text-center">
      <div className="tile border border-white/10 transition-colors group-hover:border-white/35">
        <span className="relative z-10 text-6xl leading-none drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
          {setup.track.flag}
        </span>
        <span className="f1-eyebrow absolute left-3 top-3 z-10 text-[10px] text-white/40">
          {setup.track.country}
        </span>
        <span className="f1-eyebrow absolute bottom-3 left-0 right-0 z-10 text-white/60">
          {typeLabel(setup.type)}
        </span>
        {setup.featured && (
          <span className="f1-eyebrow absolute left-3 top-3 z-10 border border-white/30 px-2 py-0.5 text-[10px] text-white">
            Хит
          </span>
        )}
        {setup.owned && (
          <span className="f1-eyebrow absolute right-3 top-3 z-10 border border-white/30 px-2 py-0.5 text-[10px] text-white">
            Куплено
          </span>
        )}
      </div>

      <h3 className="f1-title mt-4 text-sm text-white">{setup.track.name}</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">
        {setup.track.country} · {packLabel(setup.pack)}
      </p>
      <p className="mt-2 text-sm text-white/70">
        {setup.owned ? 'Открыт в кабинете' : `${setup.price.toFixed(0)} ₽`}
        {!setup.owned && setup.oldPrice ? (
          <span className="ml-2 text-white/35 line-through">{setup.oldPrice.toFixed(0)} ₽</span>
        ) : null}
      </p>
    </Link>
  )
}
