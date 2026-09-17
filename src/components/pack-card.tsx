'use client'

import Link from 'next/link'
import { gameLabel } from '@/lib/f1-data'
import { cn } from '@/lib/utils'

export type PackCardData = {
  id: string
  slug: string
  title: string
  description: string
  game: string
  price: number
  oldPrice?: number | null
  tracksCount?: number
  featured?: boolean
  owned?: boolean
  pilot: { name: string; title?: string; slug: string }
}

/** Пак: все сетапы одного пилота одной покупкой. */
export function PackCard({ pack }: { pack: PackCardData }) {
  const isFull = pack.game === 'all'

  return (
    <Link href={`/pack/${pack.id}`} className="group block text-center">
      <div
        className={cn(
          'tile border transition-colors group-hover:border-white/35',
          isFull ? 'border-white/40' : 'border-white/10'
        )}
      >
        <span className="f1-eyebrow absolute left-3 top-3 z-10 text-[10px] text-white/40">
          {gameLabel(pack.game)}
        </span>
        {isFull && (
          <span className="f1-eyebrow absolute right-3 top-3 z-10 bg-white px-2 py-0.5 text-[10px] text-black">
            Фулл
          </span>
        )}
        <div className="relative z-10 px-6">
          <p className="f1-title text-lg text-white">{pack.pilot.name}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/45">
            {pack.tracksCount ?? 0} трасс · сухо и дождь
          </p>
          {isFull && (
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">
              F1 25 + 2026
            </p>
          )}
        </div>
        {pack.owned && (
          <span className="f1-eyebrow absolute bottom-3 right-3 z-10 border border-white/30 px-2 py-0.5 text-[10px] text-white">
            Куплен
          </span>
        )}
      </div>

      <h3 className="f1-title mt-4 text-sm text-white">{pack.title}</h3>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">{pack.pilot.title}</p>
      <p className="mt-2 text-sm text-white/70">
        {pack.owned ? 'Открыт в кабинете' : `${pack.price.toFixed(0)} ₽`}
        {!pack.owned && pack.oldPrice ? (
          <span className="ml-2 text-white/35 line-through">{pack.oldPrice.toFixed(0)} ₽</span>
        ) : null}
      </p>
    </Link>
  )
}
