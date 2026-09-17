'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
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
import { GAMES, gameLabel } from '@/lib/f1-data'
import type { AdminPack, AdminPilot, AdminSetup } from '@/components/admin/types'
import { cn } from '@/lib/utils'

type FormState = {
  id?: string
  slug: string
  title: string
  description: string
  pilotId: string
  game: string
  price: string
  oldPrice: string
  featured: boolean
  active: boolean
  order: string
  setupIds: string[]
}

const empty: FormState = {
  slug: '',
  title: '',
  description: '',
  pilotId: '',
  game: 'f125',
  price: '1990',
  oldPrice: '',
  featured: false,
  active: true,
  order: '0',
  setupIds: [],
}

export function AdminPacks() {
  const [packs, setPacks] = useState<AdminPack[]>([])
  const [pilots, setPilots] = useState<AdminPilot[]>([])
  const [setups, setSetups] = useState<AdminSetup[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(empty)

  const load = useCallback(() => {
    Promise.all([
      fetch('/api/packs').then((r) => r.json()),
      fetch('/api/pilots').then((r) => r.json()),
      fetch('/api/setups').then((r) => r.json()),
    ])
      .then(([p, pl, s]) => {
        setPacks(p.packs || [])
        setPilots(pl.pilots || [])
        setSetups(s.setups || [])
      })
      .catch(() => toast.error('Не удалось загрузить паки'))
  }, [])

  useEffect(load, [load])

  /** Сетапы выбранного пилота в выбранной игре — из них собирается пак. */
  const candidates = useMemo(
    () =>
      setups.filter(
        (setup) =>
          (!form.pilotId || setup.pilotId === form.pilotId) &&
          (form.game === 'all' || setup.pack === form.game)
      ),
    [setups, form.pilotId, form.game]
  )

  const openEdit = (pack: AdminPack) => {
    setForm({
      id: pack.id,
      slug: pack.slug,
      title: pack.title,
      description: pack.description,
      pilotId: pack.pilotId,
      game: pack.game,
      price: String(pack.price),
      oldPrice: pack.oldPrice ? String(pack.oldPrice) : '',
      featured: pack.featured,
      active: pack.active,
      order: String(pack.order),
      setupIds: pack.setups.map((item) => item.setupId),
    })
    setOpen(true)
  }

  const toggleSetup = (id: string) =>
    setForm((f) => ({
      ...f,
      setupIds: f.setupIds.includes(id) ? f.setupIds.filter((x) => x !== id) : [...f.setupIds, id],
    }))

  const selectAll = () => setForm((f) => ({ ...f, setupIds: candidates.map((s) => s.id) }))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.pilotId) return toast.error('Выберите пилота')
    if (!form.setupIds.length) return toast.error('Добавьте в пак хотя бы один сетап')

    setSaving(true)
    try {
      const response = await fetch(form.id ? `/api/packs/${form.id}` : '/api/packs', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price: Number(form.price) || 0,
          oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
          order: Number(form.order) || 0,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить пак')
      toast.success(form.id ? 'Пак обновлён' : 'Пак создан')
      setOpen(false)
      setForm(empty)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (pack: AdminPack) => {
    if (!confirm(`Удалить пак «${pack.title}»?`)) return
    const response = await fetch(`/api/packs/${pack.id}`, { method: 'DELETE' })
    if (!response.ok) return toast.error('Не удалось удалить пак')
    toast.success('Пак удалён')
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Пак открывает покупателю все входящие в него сетапы одной оплатой.
        </p>
        <Button
          onClick={() => {
            setForm({ ...empty, pilotId: pilots[0]?.id ?? '' })
            setOpen(true)
          }}
          className="bg-white text-black hover:bg-white/85"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Создать пак
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packs.map((pack) => (
          <Card key={pack.id} className="border-border/70 bg-card/80 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="f1-title text-base">{pack.title}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {pack.pilot?.name} · {gameLabel(pack.game)}
                </p>
              </div>
              <Badge variant="outline" className={pack.active ? 'border-emerald-500/40 text-emerald-300' : 'border-white/20'}>
                {pack.active ? 'В продаже' : 'Скрыт'}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {pack.setups.length} сетапов · продаж: {pack.sales}
            </p>
            <p className="f1-title mt-2 text-lg">{pack.price.toFixed(0)} ₽</p>
            <div className="mt-3 flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => openEdit(pack)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => remove(pack)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {packs.length === 0 && <p className="text-sm text-muted-foreground">Паков пока нет.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="f1-title text-xl">
              {form.id ? 'Редактирование пака' : 'Новый пак'}
            </DialogTitle>
            <DialogDescription>Наберите сетапы одного пилота — покупатель получит их все.</DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pk-title">Название</Label>
                <Input id="pk-title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pk-slug">Slug</Label>
                <Input id="pk-slug" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Пилот</Label>
                <Select value={form.pilotId} onValueChange={(v) => setForm((f) => ({ ...f, pilotId: v, setupIds: [] }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите пилота" /></SelectTrigger>
                  <SelectContent>
                    {pilots.map((pilot) => (
                      <SelectItem key={pilot.id} value={pilot.id}>{pilot.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Игра</Label>
                <Select value={form.game} onValueChange={(v) => setForm((f) => ({ ...f, game: v, setupIds: [] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GAMES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pk-price">Цена, ₽</Label>
                <Input id="pk-price" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pk-old">Цена по отдельности, ₽</Label>
                <Input id="pk-old" type="number" value={form.oldPrice} onChange={(e) => setForm((f) => ({ ...f, oldPrice: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pk-desc">Описание</Label>
              <Textarea id="pk-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Сетапы в паке ({form.setupIds.length})</Label>
                <Button type="button" size="sm" variant="ghost" onClick={selectAll}>
                  Выбрать все ({candidates.length})
                </Button>
              </div>
              <div className="max-h-56 overflow-y-auto border border-white/10">
                {candidates.map((setup) => (
                  <button
                    key={setup.id}
                    type="button"
                    onClick={() => toggleSetup(setup.id)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2 text-left text-sm last:border-b-0',
                      form.setupIds.includes(setup.id) ? 'bg-white/10 text-white' : 'text-white/60'
                    )}
                  >
                    <span>{setup.track.flag} {setup.track.name}</span>
                    <span className="text-xs text-white/40">{setup.price.toFixed(0)} ₽</span>
                  </button>
                ))}
                {candidates.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    У этого пилота нет сетапов для выбранной игры.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-white/85">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Сохранить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
