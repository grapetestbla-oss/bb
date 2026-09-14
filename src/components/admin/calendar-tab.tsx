'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RACE_STATUS, formatDateTime, toDateTimeLocal } from '@/lib/format'
import { api, type AdminOverview, type AdminRace } from './types'

const TRACK_PRESETS = [
  'Бахрейн — Sakhir', 'Джидда — Corniche', 'Мельбурн — Albert Park', 'Судзука — Suzuka',
  'Шанхай — Shanghai', 'Майами — Miami', 'Имола — Imola', 'Монако — Monte Carlo',
  'Барселона — Catalunya', 'Монреаль — Gilles Villeneuve', 'Шпильберг — Red Bull Ring',
  'Сильверстоун — Silverstone', 'Спа — Spa-Francorchamps', 'Будапешт — Hungaroring',
  'Зандворт — Zandvoort', 'Монца — Monza', 'Баку — Baku City', 'Сингапур — Marina Bay',
  'Остин — COTA', 'Мехико — Hermanos Rodríguez', 'Интерлагос — Interlagos',
  'Лас-Вегас — Strip Circuit', 'Лусаил — Losail', 'Абу-Даби — Yas Marina',
]

export function CalendarTab({ data, refresh }: { data: AdminOverview; refresh: () => void }) {
  const [form, setForm] = useState({ name: '', track: '', country: '', date: '', laps: '', broadcastUrl: '' })
  const [busy, setBusy] = useState(false)

  if (!data.season) {
    return <p className="surface p-8 text-center text-sm text-muted-foreground">Сначала создайте сезон во вкладке «Сезоны».</p>
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/api/admin/races', 'POST', {
        seasonId: data.season!.id,
        name: form.name,
        track: form.track || form.name,
        country: form.country,
        date: new Date(form.date).toISOString(),
        laps: form.laps ? Number(form.laps) : undefined,
        broadcastUrl: form.broadcastUrl,
      })
      toast.success('Этап добавлен в календарь')
      setForm({ name: '', track: '', country: '', date: '', laps: '', broadcastUrl: '' })
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="surface space-y-4 p-5">
        <h2 className="text-base font-bold">Новый этап</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-xs">Название этапа *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Гран-при Монако" required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Трасса</Label>
            <Input
              value={form.track}
              onChange={(e) => setForm({ ...form, track: e.target.value })}
              placeholder="Monte Carlo"
              list="track-presets"
            />
            <datalist id="track-presets">
              {TRACK_PRESETS.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Страна</Label>
            <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Монако" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Дата и время *</Label>
            <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Кругов</Label>
            <Input type="number" value={form.laps} onChange={(e) => setForm({ ...form, laps: e.target.value })} placeholder="50%" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Ссылка на трансляцию</Label>
            <Input value={form.broadcastUrl} onChange={(e) => setForm({ ...form, broadcastUrl: e.target.value })} placeholder="https://twitch.tv/..." />
          </div>
        </div>
        <Button type="submit" disabled={busy}><Plus className="mr-1.5 h-4 w-4" /> Добавить этап</Button>
      </form>

      {data.races.length ? (
        <div className="space-y-3">
          {data.races.map((race) => (
            <RaceCard key={race.id} race={race} refresh={refresh} />
          ))}
        </div>
      ) : (
        <p className="surface p-8 text-center text-sm text-muted-foreground">Календарь сезона пуст.</p>
      )}
    </div>
  )
}

function RaceCard({ race, refresh }: { race: AdminRace; refresh: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    round: race.round,
    name: race.name,
    track: race.track,
    country: race.country ?? '',
    flag: race.flag ?? '',
    date: toDateTimeLocal(race.date),
    laps: race.laps?.toString() ?? '',
    status: race.status,
    broadcastUrl: race.broadcastUrl ?? '',
    notes: race.notes ?? '',
  })

  useEffect(() => {
    setForm({
      round: race.round,
      name: race.name,
      track: race.track,
      country: race.country ?? '',
      flag: race.flag ?? '',
      date: toDateTimeLocal(race.date),
      laps: race.laps?.toString() ?? '',
      status: race.status,
      broadcastUrl: race.broadcastUrl ?? '',
      notes: race.notes ?? '',
    })
  }, [race])

  async function save() {
    setBusy(true)
    try {
      await api(`/api/admin/races/${race.id}`, 'PATCH', {
        ...form,
        laps: form.laps ? Number(form.laps) : null,
        date: new Date(form.date).toISOString(),
      })
      toast.success('Этап обновлён')
      setOpen(false)
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`Удалить этап «${race.name}» вместе с результатами?`)) return
    setBusy(true)
    try {
      await api(`/api/admin/races/${race.id}`, 'DELETE')
      toast.success('Этап удалён')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-lg font-black text-primary">
          {race.round}
        </div>
        <div className="min-w-[180px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{race.name}</span>
            <Badge variant="outline">{RACE_STATUS[race.status] ?? race.status}</Badge>
            {race.results.length > 0 && <Badge variant="secondary">{race.results.length} результатов</Badge>}
          </div>
          <div className="text-sm text-muted-foreground">{race.track}{race.country ? `, ${race.country}` : ''}</div>
        </div>
        <div className="text-sm tabular-nums text-muted-foreground">{formatDateTime(race.date)}</div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            {open ? 'Свернуть' : 'Редактировать'}
          </Button>
          <Button size="icon" variant="ghost" className="text-destructive" onClick={remove} disabled={busy}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-xs">Номер этапа</Label>
              <Input type="number" min={1} value={form.round} onChange={(e) => setForm({ ...form, round: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Название</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Трасса</Label>
              <Input value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Страна</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Дата и время</Label>
              <Input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Кругов</Label>
              <Input type="number" value={form.laps} onChange={(e) => setForm({ ...form, laps: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Статус</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RACE_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Флаг (эмодзи)</Label>
              <Input value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value })} placeholder="🇲🇨" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Ссылка на трансляцию</Label>
              <Input value={form.broadcastUrl} onChange={(e) => setForm({ ...form, broadcastUrl: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Заметка к этапу</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <Button size="sm" onClick={save} disabled={busy}><Save className="mr-1.5 h-4 w-4" /> Сохранить этап</Button>
        </div>
      )}
    </div>
  )
}
