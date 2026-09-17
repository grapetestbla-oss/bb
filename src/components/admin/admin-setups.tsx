'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CONDITIONS, EMPTY_SETUP, PACKS, SETUP_FIELDS, packLabel, type SetupData } from '@/lib/f1-data'
import type { AdminSetup, AdminTrack, AdminPilot } from '@/components/admin/types'
import { cn } from '@/lib/utils'

type VariantForm = { condition: string; title: string; notes: string; data: SetupData }

type FormState = {
  id?: string
  trackId: string
  pilotId: string
  title: string
  pack: string
  price: string
  oldPrice: string
  description: string
  featured: boolean
  active: boolean
  variants: VariantForm[]
}

const emptyVariants = (): VariantForm[] =>
  CONDITIONS.map((condition) => ({
    condition: condition.value,
    title: condition.label,
    notes: condition.hint,
    data: { ...EMPTY_SETUP },
  }))

const emptyForm = (trackId = '', pilotId = ''): FormState => ({
  trackId,
  pilotId,
  title: '',
  pack: 'f125',
  price: '199',
  oldPrice: '',
  description: '',
  featured: false,
  active: true,
  variants: emptyVariants(),
})

export function AdminSetups() {
  const [setups, setSetups] = useState<AdminSetup[]>([])
  const [tracks, setTracks] = useState<AdminTrack[]>([])
  const [pilots, setPilots] = useState<AdminPilot[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm())
  const [tab, setTab] = useState(0)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/setups').then((r) => r.json()),
      fetch('/api/tracks').then((r) => r.json()),
      fetch('/api/pilots').then((r) => r.json()),
    ])
      .then(([s, t, p]) => {
        setSetups(s.setups || [])
        setTracks(t.tracks || [])
        setPilots(p.pilots || [])
      })
      .catch(() => toast.error('Не удалось загрузить данные'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const openCreate = () => {
    setForm(emptyForm(tracks[0]?.id, pilots[0]?.id))
    setTab(0)
    setOpen(true)
  }

  const openEdit = (setup: AdminSetup) => {
    const variants: VariantForm[] = (setup.variants ?? []).map((variant) => {
      let data: SetupData = { ...EMPTY_SETUP }
      try {
        data = { ...EMPTY_SETUP, ...(JSON.parse(variant.data || '{}') as SetupData) }
      } catch {
        /* значения по умолчанию */
      }
      return { condition: variant.condition, title: variant.title, notes: variant.notes, data }
    })

    setForm({
      id: setup.id,
      trackId: setup.trackId,
      pilotId: setup.pilotId,
      title: setup.title,
      pack: setup.pack,
      price: String(setup.price),
      oldPrice: setup.oldPrice ? String(setup.oldPrice) : '',
      description: setup.description,
      featured: setup.featured,
      active: setup.active,
      variants: variants.length ? variants : emptyVariants(),
    })
    setTab(0)
    setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.trackId) return toast.error('Выберите трассу')
    if (!form.pilotId) return toast.error('Выберите пилота')

    setSaving(true)
    try {
      const dry = form.variants.find((v) => v.condition === 'dry')?.data ?? form.variants[0].data
      const payload = {
        trackId: form.trackId,
        pilotId: form.pilotId,
        title: form.title,
        pack: form.pack,
        price: Number(form.price) || 0,
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        description: form.description,
        featured: form.featured,
        active: form.active,
        variants: form.variants,
        previewData: { frontWing: dry.frontWing, rearWing: dry.rearWing, brakeBias: dry.brakeBias },
      }
      const response = await fetch(form.id ? `/api/setups/${form.id}` : '/api/setups', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить сетап')
      toast.success(form.id ? 'Сетап обновлён' : 'Сетап добавлен в каталог')
      setOpen(false)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (setup: AdminSetup) => {
    if (!confirm(`Удалить сетап «${setup.track.name} — ${setup.pilot.name}»?`)) return
    const response = await fetch(`/api/setups/${setup.id}`, { method: 'DELETE' })
    if (response.ok) {
      toast.success('Сетап удалён')
      load()
    } else {
      toast.error('Не удалось удалить сетап')
    }
  }

  const toggleActive = async (setup: AdminSetup) => {
    await fetch(`/api/setups/${setup.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !setup.active }),
    })
    load()
  }

  const visible = setups.filter((s) => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    return s.track.name.toLowerCase().includes(q) || s.pilot.name.toLowerCase().includes(q)
  })

  const groups = Array.from(new Set(SETUP_FIELDS.map((f) => f.group)))
  const current = form.variants[tab]

  const setValue = (key: keyof SetupData, value: number) =>
    setForm((f) => ({
      ...f,
      variants: f.variants.map((variant, index) =>
        index === tab ? { ...variant, data: { ...variant.data, [key]: value } } : variant
      ),
    }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Поиск по трассе или пилоту"
          className="max-w-xs"
        />
        <Button onClick={openCreate} className="ml-auto bg-white text-black hover:bg-white/85">
          <Plus className="mr-1.5 h-4 w-4" /> Добавить сетап
        </Button>
      </div>

      {loading ? (
        <Card className="p-10 text-center text-muted-foreground">Загрузка…</Card>
      ) : (
        <Card className="gap-0 overflow-x-auto border-border/70 bg-card/80 p-0">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="carbon text-left uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3">Трасса</th>
                <th className="px-4 py-3">Пилот</th>
                <th className="px-4 py-3">Варианты</th>
                <th className="px-4 py-3">Игра</th>
                <th className="px-4 py-3">Цена</th>
                <th className="px-4 py-3">Продажи</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {visible.map((setup) => (
                <tr key={setup.id} className="hover:bg-white/[0.03]">
                  <td className="px-4 py-3">{setup.track.flag} {setup.track.name}</td>
                  <td className="px-4 py-3">{setup.pilot.name}</td>
                  <td className="px-4 py-3">{setup.variants?.length ?? 0}</td>
                  <td className="px-4 py-3">{packLabel(setup.pack)}</td>
                  <td className="px-4 py-3 tabular-nums">{setup.price.toFixed(0)} ₽</td>
                  <td className="px-4 py-3">{setup.sales}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      onClick={() => toggleActive(setup)}
                      className={
                        setup.active
                          ? 'cursor-pointer border-emerald-500/40 text-emerald-300'
                          : 'cursor-pointer border-white/20 text-muted-foreground'
                      }
                    >
                      {setup.active ? 'В продаже' : 'Скрыт'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(setup)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => remove(setup)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Сетапы не найдены.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="f1-title text-xl">
              {form.id ? 'Редактирование сетапа' : 'Новый сетап'}
            </DialogTitle>
            <DialogDescription>
              Один товар на трассу: квалификацию и гонку не делим, внутри лежат варианты по условиям.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Трасса</Label>
                <Select value={form.trackId} onValueChange={(v) => setForm((f) => ({ ...f, trackId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите трассу" /></SelectTrigger>
                  <SelectContent>
                    {tracks.map((track) => (
                      <SelectItem key={track.id} value={track.id}>
                        {track.flag} {track.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Пилот</Label>
                <Select value={form.pilotId} onValueChange={(v) => setForm((f) => ({ ...f, pilotId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите пилота" /></SelectTrigger>
                  <SelectContent>
                    {pilots.map((pilot) => (
                      <SelectItem key={pilot.id} value={pilot.id}>{pilot.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-title">Название</Label>
                <Input
                  id="s-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Monza — Коля"
                />
              </div>
              <div className="space-y-2">
                <Label>Игра</Label>
                <Select value={form.pack} onValueChange={(v) => setForm((f) => ({ ...f, pack: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PACKS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-price">Цена, ₽</Label>
                <Input
                  id="s-price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-old">Старая цена, ₽</Label>
                <Input
                  id="s-old"
                  type="number"
                  min="0"
                  value={form.oldPrice}
                  onChange={(e) => setForm((f) => ({ ...f, oldPrice: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-desc">Описание</Label>
              <Textarea
                id="s-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
                Показывать на главной
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
                В продаже
              </label>
            </div>

            {/* Варианты */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {form.variants.map((variant, index) => (
                  <button
                    key={variant.condition}
                    type="button"
                    onClick={() => setTab(index)}
                    className={cn(
                      'border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/60',
                      index === tab && 'border-white bg-white text-black'
                    )}
                  >
                    {variant.title || variant.condition}
                  </button>
                ))}
              </div>

              {current && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="v-title">Название варианта</Label>
                      <Input
                        id="v-title"
                        value={current.title}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            variants: f.variants.map((v, i) => (i === tab ? { ...v, title: e.target.value } : v)),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="v-notes">Комментарий к варианту</Label>
                      <Input
                        id="v-notes"
                        value={current.notes}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            variants: f.variants.map((v, i) => (i === tab ? { ...v, notes: e.target.value } : v)),
                          }))
                        }
                      />
                    </div>
                  </div>

                  {groups.map((group) => (
                    <div key={group}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {SETUP_FIELDS.filter((f) => f.group === group).map((field) => (
                          <div key={field.key} className="space-y-1.5">
                            <Label htmlFor={`f-${field.key}`} className="text-xs">
                              {field.label}
                              {field.unit ? `, ${field.unit}` : ''}
                            </Label>
                            <Input
                              id={`f-${field.key}`}
                              type="number"
                              step={field.step ?? 1}
                              value={current.data[field.key]}
                              onChange={(e) => setValue(field.key, Number(e.target.value))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-white/85">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
