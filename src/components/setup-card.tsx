'use client'

import Link from 'next/link'
import { Gauge, ShoppingCart, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { packLabel, SETUP_TYPES, typeLabel } from '@/lib/f1-data'
import { cn } from '@/lib/utils'

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

export function SetupCard({ setup }: { setup: SetupCardData }) {
  const typeColor = SETUP_TYPES.find((t) => t.value === setup.type)?.color ?? 'text-foreground'

  return (
    <Card className="stripe-left card-hover relative flex h-full flex-col gap-0 overflow-hidden border-border/70 bg-card/80 p-0">
      <div className="carbon flex items-center justify-between px-5 py-3">
        <span className="text-2xl leading-none">{setup.track.flag}</span>
        <div className="flex gap-1.5">
          {setup.featured && (
            <Badge className="bg-[#e10600] text-[10px] uppercase tracking-wide">Хит</Badge>
          )}
          <Badge variant="outline" className="border-white/20 text-[10px] uppercase">
            {packLabel(setup.pack)}
          </Badge>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {setup.track.country}
        </p>
        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug">{setup.track.name}</h3>
        <p className={cn('mt-2 text-sm font-semibold uppercase tracking-wide', typeColor)}>
          {typeLabel(setup.type)}
        </p>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{setup.description}</p>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" /> {setup.sales} продаж
          </span>
          <span className="inline-flex items-center gap-1">
            <Gauge className="h-3.5 w-3.5" /> 21 параметр
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-5">
          <div>
            {setup.owned ? (
              <span className="text-sm font-bold uppercase text-emerald-400">Куплено</span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="f1-title text-2xl">{setup.price.toFixed(0)} ₽</span>
                {setup.oldPrice ? (
                  <span className="text-sm text-muted-foreground line-through">
                    {setup.oldPrice.toFixed(0)} ₽
                  </span>
                ) : null}
              </div>
            )}
          </div>
          <Button asChild size="sm" className="bg-[#e10600] hover:bg-[#ff1a12]">
            <Link href={`/setup/${setup.id}`}>
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              {setup.owned ? 'Открыть' : 'Купить'}
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  )
}
