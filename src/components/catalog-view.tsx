'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SetupCard, type SetupCardData } from '@/components/setup-card'
import { PACKS, SETUP_TYPES } from '@/lib/f1-data'
import { cn } from '@/lib/utils'

type Track = {
  id: string
  slug: string
  name: string
  country: string
  flag: string
  pack: string
  round: number
  _count?: { setups: number }
}

export function CatalogView() {
  const params = useSearchParams()
  const [setups, setSetups] = useState<SetupCardData[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pack, setPack] = useState<string>(params.get('pack') || '')
  const [type, setType] = useState<string>(params.get('type') || '')
  const [track, setTrack] = useState<string>(params.get('track') || '')

  useEffect(() => {
    fetch('/api/tracks')
      .then((r) => r.json())
      .then((d) => setTracks(d.tracks || []))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const query = new URLSearchParams()
    if (pack) query.set('pack', pack)
    if (type) query.set('type', type)
    if (track) query.set('track', track)
    fetch(`/api/setups?${query.toString()}`)
      .then((r) => r.json())
      .then((d) => setSetups(d.setups || []))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [pack, type, track])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return setups
    return setups.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.track.name.toLowerCase().includes(q) ||
        s.track.country.toLowerCase().includes(q)
    )
  }, [setups, search])

  const visibleTracks = useMemo(
    () => tracks.filter((t) => (pack === 's2026' ? t.pack === 's2026' : pack === 'f125' ? t.pack !== 's2026' : true)),
    [tracks, pack]
  )

  // фильтры меняются здесь, чтобы индикатор загрузки не выставлялся внутри эффекта
  const applyPack = (value: string) => {
    setLoading(true)
    setPack(value)
  }
  const applyType = (value: string) => {
    setLoading(true)
    setType(value)
  }
  const applyTrack = (value: string) => {
    setLoading(true)
    setTrack(value)
  }

  const reset = () => {
    setLoading(true)
    setPack('')
    setType('')
    setTrack('')
    setSearch('')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="f1-title text-4xl">Каталог сетапов</h1>
          <p className="mt-2 text-muted-foreground">
            {loading ? 'Загрузка…' : `${visible.length} сетапов на ${visibleTracks.length} трассах`}
          </p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по трассе или стране…"
            className="pl-9"
          />
        </div>
      </div>

      <Card className="mt-6 gap-4 border-border/70 bg-card/70 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          <SlidersHorizontal className="h-4 w-4 text-[#e10600]" /> Фильтры
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={!pack} onClick={() => applyPack('')}>Все пакеты</FilterChip>
          {PACKS.map((p) => (
            <FilterChip key={p.value} active={pack === p.value} onClick={() => applyPack(p.value)}>
              {p.label}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={!type} onClick={() => applyType('')}>Любой тип</FilterChip>
          {SETUP_TYPES.map((t) => (
            <FilterChip key={t.value} active={type === t.value} onClick={() => applyType(t.value)}>
              {t.label}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={!track} onClick={() => applyTrack('')}>Все трассы</FilterChip>
          {visibleTracks.map((t) => (
            <FilterChip key={t.id} active={track === t.slug} onClick={() => applyTrack(t.slug)}>
              <span className="mr-1">{t.flag}</span>
              {t.name.replace(/ \(2026\)$/, '')}
            </FilterChip>
          ))}
        </div>

        {(pack || type || track || search) && (
          <Button variant="ghost" size="sm" className="w-fit text-[#e10600]" onClick={reset}>
            Сбросить фильтры
          </Button>
        )}
      </Card>

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((setup) => (
            <SetupCard key={setup.id} setup={setup} />
          ))}
        </div>
      ) : (
        <Card className="mt-8 border-dashed border-border/70 bg-card/50 p-12 text-center">
          <p className="text-muted-foreground">По вашему запросу сетапов не найдено.</p>
          <Button variant="outline" className="mx-auto mt-4 w-fit" onClick={reset}>
            Сбросить фильтры
          </Button>
        </Card>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Badge
      onClick={onClick}
      variant="outline"
      className={cn(
        'cursor-pointer select-none border-border/70 px-3 py-1.5 text-xs font-medium transition-colors hover:border-[#e10600]/70',
        active && 'border-[#e10600] bg-[#e10600]/15 text-[#ff6a5c]'
      )}
    >
      {children}
    </Badge>
  )
}
