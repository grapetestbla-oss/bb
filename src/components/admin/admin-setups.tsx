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
import { EMPTY_SETUP, PACKS, SETUP_FIELDS, SETUP_TYPES, packLabel, typeLabel, type SetupData } from '@/lib/f1-data'
import type { AdminSetup, AdminTrack } from '@/components/admin/types'

type FormState = {
  id?: string
  trackId: string
  title: string
  type: string
  pack: string
  price: string
  oldPrice: string
  description: string
  featured: boolean
  active: boolean
  data: SetupData
}

const emptyForm = (trackId = ''): FormState => ({
  trackId,
  title: '',
  type: 'race',
  pack: 'f125',
  price: '199',
  oldPrice: '',
  description: '',
  featured: false,
  active: true,
  data: { ...EMPTY_SETUP },
})

export function AdminSetups() {
  const [setups, setSetups] = useState<AdminSetup[]>([])
  const [tracks, setTracks] = useState<AdminTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm())

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/setups').then((r) => r.json()),
      fetch('/api/tracks').then((r) => r.json()),
    ])
      .then(([s, t]) => {
        setSetups(s.setups || [])
        setTracks(t.tracks || [])
      })
      .catch(() => toast.error('Не удалось загрузить данные'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const openCreate = () => {
    setForm(emptyForm(tracks[0]?.id))
    setOpen(true)
  }

  const openEdit = (setup: AdminSetup) => {
    let data: SetupData = { ...EMPTY_SETUP }
    try {
      data = { ...EMPTY_SETUP, ...(JSON.parse(setup.data || '{}') as SetupData) }
    } catch {
      /* значения по умолчанию */
    }
    setForm({
      id: setup.id,
      trackId: setup.trackId,
      title: setup.title,
      type: setup.type,
      pack: setup.pack,
      price: String(setup.price),
      oldPrice: setup.oldPrice ? String(setup.oldPrice) : '',
      description: setup.description,
      featured: setup.featured,
      active: setup.active,
      data,
    })
    setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.trackId) return toast.error('Выберите трассу')
    setSaving(true)
    try {
      const payload = {
        trackId: form.trackId,
        title: form.title,
        type: form.type,
        pack: form.pack,
        price: Number(form.price) || 0,
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        description: form.description,
        featured: form.featured,
        active: form.active,
        data: form.data,
        previewData: {
          frontWing: form.data.frontWing,
          rearWing: form.data.rearWing,
          brakeBias: form.data.brakeBias,
        },
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
    if (!confirm(`Удалить сетап «${setup.title}»?`)) return
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
    return s.title.toLowerCase().includes(q) || s.track.name.toLowerCase().includes(q)
  })

  const groups = Array.from(new Set(SETUP_FIELDS.map((f) => f.group)))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Поиск по названию или трассе"
          className="max-w-xs"
        />
        <Button onClick={openCreate} className="ml-auto bg-[#9d3f38] hover:bg-[#b34d44]">
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
                <th className="px-4 py-3">Название</th>
                <th className="px-4 py-3">Тип</th>
                <th className="px-4 py-3">Пакет</th>
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
                  <td className="px-4 py-3">{setup.title}</td>
                  <td className="px-4 py-3">{typeLabel(setup.type)}</td>
                  <td className="px-4 py-3">{packLabel(setup.pack)}</td>
                  <td className="px-4 py-3 font-mono">{setup.price.toFixed(0)} ₽</td>
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
            <DialogTitle className="f1-title text-2xl">
              {form.id ? 'Редактирование сетапа' : 'Новый сетап'}
            </DialogTitle>
            <DialogDescription>
              Параметры откроются покупателю сразу после подтверждения оплаты.
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
                <Label htmlFor="s-title">Название</Label>
                <Input
                  id="s-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Гоночный сетап — Monza"
                />
              </div>
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SETUP_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Пакет</Label>
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
                <Label htmlFor="s-old">Старая цена, ₽ (для скидки)</Label>
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
                Показывать как «Хит»
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
                В продаже
              </label>
            </div>

            <div className="space-y-4">
              <h3 className="f1-title text-lg">Параметры машины</h3>
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
                          value={form.data[field.key]}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              data: { ...f.data, [field.key]: Number(e.target.value) },
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#9d3f38] hover:bg-[#b34d44]">
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
