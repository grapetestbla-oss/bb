'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Save, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SEASON_STATUS } from '@/lib/format'
import { api, type AdminOverview, type AdminSeason } from './types'

const emptyDraft = {
  name: '',
  status: 'UPCOMING',
  description: '',
  rules: '',
  pointsSystem: '[25,18,15,12,10,8,6,4,2,1]',
  fastestLapPoint: 1,
  polePoint: 0,
  applicationsOpen: true,
  isCurrent: true,
}

export function SeasonsTab({
  data,
  refresh,
  onSelectSeason,
}: {
  data: AdminOverview
  refresh: () => void
  onSelectSeason: (id: string) => void
}) {
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [busy, setBusy] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await api<{ season: AdminSeason }>('/api/admin/seasons', 'POST', draft)
      toast.success('Сезон создан')
      setDraft(emptyDraft)
      setCreating(false)
      onSelectSeason(res.season.id)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Сезоны лиги</h2>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" /> Новый сезон
        </Button>
      </div>

      {creating && (
        <form onSubmit={create} className="surface space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Сезон 1 · F1 25" required />
            </div>
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SEASON_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Очки за места (JSON)</Label>
              <Input value={draft.pointsSystem} onChange={(e) => setDraft({ ...draft, pointsSystem: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Очко за быстрый круг</Label>
              <Input type="number" value={draft.fastestLapPoint} onChange={(e) => setDraft({ ...draft, fastestLapPoint: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label>Очко за поул</Label>
              <Input type="number" value={draft.polePoint} onChange={(e) => setDraft({ ...draft, polePoint: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.isCurrent} onCheckedChange={(v) => setDraft({ ...draft, isCurrent: v })} />
              Сделать текущим сезоном
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.applicationsOpen} onCheckedChange={(v) => setDraft({ ...draft, applicationsOpen: v })} />
              Приём заявок открыт
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>Создать сезон</Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Отмена</Button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {data.seasons.length ? (
          data.seasons.map((season) => (
            <SeasonCard
              key={season.id}
              season={season}
              active={season.id === data.season?.id}
              refresh={refresh}
              onSelectSeason={onSelectSeason}
            />
          ))
        ) : (
          <p className="surface p-8 text-center text-sm text-muted-foreground">
            Сезонов ещё нет. Создайте первый сезон, чтобы открыть приём заявок и календарь.
          </p>
        )}
      </div>
    </div>
  )
}

function SeasonCard({
  season,
  active,
  refresh,
  onSelectSeason,
}: {
  season: AdminSeason
  active: boolean
  refresh: () => void
  onSelectSeason: (id: string) => void
}) {
  const [form, setForm] = useState(season)
  const [busy, setBusy] = useState(false)

  useEffect(() => setForm(season), [season])

  async function save() {
    setBusy(true)
    try {
      await api(`/api/admin/seasons/${season.id}`, 'PATCH', form)
      toast.success('Сезон сохранён')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function makeCurrent() {
    setBusy(true)
    try {
      await api(`/api/admin/seasons/${season.id}`, 'PATCH', { isCurrent: true })
      toast.success('Сезон назначен текущим')
      onSelectSeason(season.id)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`Удалить сезон «${season.name}» вместе с командами, пилотами, календарём и результатами?`)) return
    setBusy(true)
    try {
      await api(`/api/admin/seasons/${season.id}`, 'DELETE')
      toast.success('Сезон удалён')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`surface p-5 ${active ? 'border-primary/50' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold">{season.name}</h3>
          <Badge variant="outline">{SEASON_STATUS[season.status] ?? season.status}</Badge>
          {season.isCurrent && <Badge>Текущий</Badge>}
          <Badge variant={season.applicationsOpen ? 'secondary' : 'destructive'}>
            {season.applicationsOpen ? 'Заявки открыты' : 'Заявки закрыты'}
          </Badge>
        </div>
        <div className="flex gap-2">
          {!active && (
            <Button size="sm" variant="outline" onClick={() => onSelectSeason(season.id)}>Открыть</Button>
          )}
          {!season.isCurrent && (
            <Button size="sm" variant="outline" onClick={makeCurrent} disabled={busy}>
              <Star className="mr-1.5 h-4 w-4" /> Сделать текущим
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs">Название</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Статус</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(SEASON_STATUS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label className="text-xs">Очки за места (JSON-массив)</Label>
          <Input value={form.pointsSystem} onChange={(e) => setForm({ ...form, pointsSystem: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Быстрый круг</Label>
          <Input type="number" value={form.fastestLapPoint} onChange={(e) => setForm({ ...form, fastestLapPoint: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Поул</Label>
          <Input type="number" value={form.polePoint} onChange={(e) => setForm({ ...form, polePoint: Number(e.target.value) })} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs">Описание сезона</Label>
          <Textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Регламент (каждая строка — пункт)</Label>
          <Textarea rows={3} value={form.rules ?? ''} onChange={(e) => setForm({ ...form, rules: e.target.value })} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={form.applicationsOpen} onCheckedChange={(v) => setForm({ ...form, applicationsOpen: v })} />
          Приём заявок
        </label>
        <Button size="sm" onClick={save} disabled={busy}>
          <Save className="mr-1.5 h-4 w-4" /> Сохранить
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={remove} disabled={busy}>
          <Trash2 className="mr-1.5 h-4 w-4" /> Удалить сезон
        </Button>
      </div>
    </div>
  )
}
