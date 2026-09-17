'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { SetupCard, type SetupCardData } from '@/components/setup-card'
import { PACKS } from '@/lib/f1-data'
import { cn } from '@/lib/utils'

type Track = { id: string; slug: string; name: string; flag: string; pack: string }
type Pilot = { id: string; slug: string; name: string; title: string }

export function CatalogView() {
  const params = useSearchParams()
  const [setups, setSetups] = useState<SetupCardData[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [pilots, setPilots] = useState<Pilot[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [pack, setPack] = useState(params.get('pack') || '')
  const [pilot, setPilot] = useState(params.get('pilot') || '')
  const [track, setTrack] = useState(params.get('track') || '')

  useEffect(() => {
    Promise.all([
      fetch('/api/tracks').then((r) => r.json()),
      fetch('/api/pilots').then((r) => r.json()),
    ])
      .then(([t, p]) => {
        setTracks(t.tracks || [])
        setPilots(p.pilots || [])
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const query = new URLSearchParams()
    if (pack) query.set('pack', pack)
    if (pilot) query.set('pilot', pilot)
    if (track) query.set('track', track)
    fetch(`/api/setups?${query.toString()}`)
      .then((r) => r.json())
      .then((d) => setSetups(d.setups || []))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [pack, pilot, track])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return setups
    return setups.filter(
      (s) =>
        s.track.name.toLowerCase().includes(q) ||
        s.track.country.toLowerCase().includes(q) ||
        s.pilot.name.toLowerCase().includes(q)
    )
  }, [setups, search])

  const visibleTracks = useMemo(
    () => tracks.filter((t) => (pack === 's2026' ? t.pack === 's2026' : pack === 'f125' ? t.pack !== 's2026' : true)),
    [tracks, pack]
  )

  const apply = (setter: (value: string) => void) => (value: string) => {
    setLoading(true)
    setter(value)
  }

  const reset = () => {
    setLoading(true)
    setPack('')
    setPilot('')
    setTrack('')
    setSearch('')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="text-center">
        <h1 className="f1-title text-[clamp(1.5rem,4vw,2.4rem)] text-white">Каталог сетапов</h1>
        <p className="mt-4 text-sm text-white/55">
          {loading ? 'Загрузка…' : `${visible.length} сетапов · один товар на трассу, внутри сухо и дождь`}
        </p>
      </div>

      <div className="mx-auto mt-8 flex max-w-md items-center gap-2 border-b border-white/20 pb-1">
        <Search className="h-4 w-4 text-white/40" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Трасса, страна или пилот"
          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 border-t border-white/10 pt-8">
        <FilterRow
          label="Игра"
          options={[{ value: '', label: 'Все' }, ...PACKS.map((p) => ({ value: p.value, label: p.label }))]}
          value={pack}
          onChange={apply(setPack)}
        />
        <FilterRow
          label="Пилот"
          options={[
            { value: '', label: 'Все пилоты' },
            ...pilots.map((p) => ({ value: p.slug, label: p.name })),
          ]}
          value={pilot}
          onChange={apply(setPilot)}
        />
        <FilterRow
          label="Трасса"
          options={[
            { value: '', label: 'Все трассы' },
            ...visibleTracks.map((t) => ({ value: t.slug, label: `${t.flag} ${t.name.replace(/ \(2026\)$/, '')}` })),
          ]}
          value={track}
          onChange={apply(setTrack)}
        />
        {(pack || pilot || track || search) && (
          <button type="button" onClick={reset} className="f1-eyebrow mt-2 text-white/50 hover:text-white">
            Сбросить фильтры
          </button>
        )}
      </div>

      {loading ? (
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full rounded-none bg-white/5" />
          ))}
        </div>
      ) : visible.length ? (
        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((setup) => (
            <SetupCard key={setup.id} setup={setup} />
          ))}
        </div>
      ) : (
        <div className="mt-12 border border-white/10 p-12 text-center">
          <p className="text-white/55">По вашему запросу сетапов не найдено.</p>
          <button type="button" onClick={reset} className="f1-eyebrow mt-4 text-white/70 hover:text-white">
            Сбросить фильтры
          </button>
        </div>
      )}
    </div>
  )
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="f1-eyebrow mr-1 text-white/35">{label}</span>
      {options.map((option) => (
        <button
          key={option.value || 'all'}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'border border-white/12 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/40',
            value === option.value && 'border-white bg-white text-black'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
