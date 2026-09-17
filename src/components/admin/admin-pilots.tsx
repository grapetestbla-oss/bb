'use client'

import { useCallback, useEffect, useState } from 'react'
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
import type { AdminPilot } from '@/components/admin/types'

type FormState = {
  id?: string
  slug: string
  name: string
  title: string
  bio: string
  contact: string
  order: string
  active: boolean
}

const empty: FormState = { slug: '', name: '', title: '', bio: '', contact: '', order: '0', active: true }

export function AdminPilots() {
  const [pilots, setPilots] = useState<AdminPilot[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(empty)

  const load = useCallback(() => {
    fetch('/api/pilots')
      .then((r) => r.json())
      .then((d) => setPilots(d.pilots || []))
      .catch(() => toast.error('Не удалось загрузить пилотов'))
  }, [])

  useEffect(load, [load])

  const openEdit = (pilot: AdminPilot) => {
    setForm({
      id: pilot.id,
      slug: pilot.slug,
      name: pilot.name,
      title: pilot.title,
      bio: pilot.bio,
      contact: pilot.contact ?? '',
      order: String(pilot.order),
      active: pilot.active,
    })
    setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await fetch(form.id ? `/api/pilots/${form.id}` : '/api/pilots', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, order: Number(form.order) || 0 }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить пилота')
      toast.success(form.id ? 'Пилот обновлён' : 'Пилот добавлен')
      setOpen(false)
      setForm(empty)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (pilot: AdminPilot) => {
    if (!confirm(`Удалить пилота «${pilot.name}»? Его сетапы и паки тоже будут удалены.`)) return
    const response = await fetch(`/api/pilots/${pilot.id}`, { method: 'DELETE' })
    if (!response.ok) return toast.error('Не удалось удалить пилота')
    toast.success('Пилот удалён')
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Авторы сетапов и паков. У каждого свой почерк настройки — покупатель выбирает по нему.
        </p>
        <Button
          onClick={() => {
            setForm(empty)
            setOpen(true)
          }}
          className="bg-white text-black hover:bg-white/85"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Добавить пилота
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pilots.map((pilot) => (
          <Card key={pilot.id} className="border-border/70 bg-card/80 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="f1-title text-base">{pilot.name}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {pilot.title || '—'}
                </p>
              </div>
              <Badge variant="outline" className={pilot.active ? 'border-emerald-500/40 text-emerald-300' : 'border-white/20'}>
                {pilot.active ? 'Активен' : 'Скрыт'}
              </Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{pilot.bio}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              Сетапов: {pilot._count?.setups ?? 0} · Паков: {pilot._count?.packs ?? 0}
            </p>
            <div className="mt-3 flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => openEdit(pilot)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => remove(pilot)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {pilots.length === 0 && (
          <p className="text-sm text-muted-foreground">Пилотов пока нет — добавьте первого.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="f1-title text-xl">
              {form.id ? 'Редактирование пилота' : 'Новый пилот'}
            </DialogTitle>
            <DialogDescription>Имя и регалии видны покупателям в каталоге и на паках.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-name">Имя</Label>
                <Input id="p-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-slug">Slug (латиницей)</Label>
                <Input id="p-slug" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-title">Регалии</Label>
                <Input id="p-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Чемпион лиги · тренер" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-contact">Контакт</Label>
                <Input id="p-contact" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} placeholder="@username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-order">Порядок</Label>
                <Input id="p-order" type="number" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-bio">Описание почерка</Label>
              <Textarea id="p-bio" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              Показывать на сайте
            </label>
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
