'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, type AdminOverview, type AdminTeam } from './types'

const PRESETS = [
  { name: 'Red Bull Racing', color: '#1E2A6E' },
  { name: 'Ferrari', color: '#D40000' },
  { name: 'Mercedes', color: '#00A19C' },
  { name: 'McLaren', color: '#FF8000' },
  { name: 'Aston Martin', color: '#006F62' },
  { name: 'Alpine', color: '#0090FF' },
  { name: 'Williams', color: '#3671C6' },
  { name: 'RB', color: '#6692FF' },
  { name: 'Kick Sauber', color: '#52E252' },
  { name: 'Haas', color: '#B6BABD' },
]

export function TeamsTab({ data, refresh }: { data: AdminOverview; refresh: () => void }) {
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [color, setColor] = useState('#D4AF37')
  const [busy, setBusy] = useState(false)

  if (!data.season) {
    return <p className="surface p-8 text-center text-sm text-muted-foreground">Сначала создайте сезон во вкладке «Сезоны».</p>
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/api/admin/teams', 'POST', { seasonId: data.season!.id, name, shortName, color })
      toast.success('Команда создана')
      setName('')
      setShortName('')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function addPreset(preset: { name: string; color: string }) {
    try {
      await api('/api/admin/teams', 'POST', { seasonId: data.season!.id, ...preset })
      toast.success(`Команда ${preset.name} добавлена`)
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={create} className="surface grid gap-4 p-5 sm:grid-cols-[1fr_140px_120px_auto] sm:items-end">
        <div className="space-y-2">
          <Label className="text-xs">Название команды *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Icons Racing" required />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Аббревиатура</Label>
          <Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="ICR" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Цвет</Label>
          <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 p-1" />
        </div>
        <Button type="submit" disabled={busy}><Plus className="mr-1.5 h-4 w-4" /> Добавить</Button>
      </form>

      <div className="surface p-5">
        <div className="text-sm font-semibold">Быстрое добавление классических команд</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.filter((p) => !data.teams.some((t) => t.name === p.name)).map((p) => (
            <Button key={p.name} size="sm" variant="outline" onClick={() => addPreset(p)}>
              <span className="mr-2 h-3 w-3 rounded-full" style={{ background: p.color }} />
              {p.name}
            </Button>
          ))}
        </div>
      </div>

      {data.teams.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.teams.map((team) => (
            <TeamCard key={team.id} team={team} data={data} refresh={refresh} />
          ))}
        </div>
      ) : (
        <p className="surface p-8 text-center text-sm text-muted-foreground">В сезоне пока нет команд.</p>
      )}
    </div>
  )
}

function TeamCard({ team, data, refresh }: { team: AdminTeam; data: AdminOverview; refresh: () => void }) {
  const [form, setForm] = useState(team)
  const [busy, setBusy] = useState(false)
  useEffect(() => setForm(team), [team])

  const drivers = data.entries.filter((e) => e.teamId === team.id)
  const points = data.standings?.teams.find((t) => t.teamId === team.id)?.points ?? 0

  async function save() {
    setBusy(true)
    try {
      await api(`/api/admin/teams/${team.id}`, 'PATCH', form)
      toast.success('Команда сохранена')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`Удалить команду «${team.name}»? Пилоты останутся в сезоне без команды.`)) return
    setBusy(true)
    try {
      await api(`/api/admin/teams/${team.id}`, 'DELETE')
      toast.success('Команда удалена')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="surface overflow-hidden">
      <div className="h-1.5 w-full" style={{ background: form.color }} />
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">{team.name}</h3>
          <div className="text-right">
            <div className="text-xl font-black tabular-nums text-primary">{points}</div>
            <div className="text-[10px] uppercase text-muted-foreground">очков</div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_100px_90px]">
          <div className="space-y-1.5">
            <Label className="text-xs">Название</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Аббр.</Label>
            <Input value={form.shortName ?? ''} onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Цвет</Label>
            <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 p-1" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Корректировка очков (штраф/бонус)</Label>
            <Input
              type="number"
              value={form.pointsAdjust}
              onChange={(e) => setForm({ ...form, pointsAdjust: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Порядок в списке</Label>
            <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Состав: {drivers.length ? drivers.map((d) => d.user.displayName).join(', ') : '— пусто —'}
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={busy}><Save className="mr-1.5 h-4 w-4" /> Сохранить</Button>
          <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={remove} disabled={busy}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Удалить
          </Button>
        </div>
      </div>
    </div>
  )
}
