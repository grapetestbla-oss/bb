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

type Plan = {
  id: string
  title: string
  description: string
  price: number
  duration: string
  features: string
  active: boolean
  order: number
}

type FormState = {
  id?: string
  title: string
  description: string
  price: string
  duration: string
  features: string
  active: boolean
  order: string
}

const empty: FormState = {
  title: '',
  description: '',
  price: '990',
  duration: '60 минут',
  features: '',
  active: true,
  order: '0',
}

export function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>(empty)

  const load = useCallback(() => {
    fetch('/api/training-plans')
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []))
      .catch(() => undefined)
  }, [])

  useEffect(load, [load])

  const openEdit = (plan: Plan) => {
    let features: string[] = []
    try {
      features = JSON.parse(plan.features || '[]')
    } catch {
      features = []
    }
    setForm({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      price: String(plan.price),
      duration: plan.duration,
      features: features.join('\n'),
      active: plan.active,
      order: String(plan.order),
    })
    setOpen(true)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        description: form.description,
        price: Number(form.price) || 0,
        duration: form.duration,
        order: Number(form.order) || 0,
        active: form.active,
        features: form.features.split('\n').map((s) => s.trim()).filter(Boolean),
      }
      const response = await fetch(form.id ? `/api/training-plans/${form.id}` : '/api/training-plans', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить программу')
      toast.success(form.id ? 'Программа обновлена' : 'Программа добавлена')
      setOpen(false)
      setForm(empty)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (plan: Plan) => {
    if (!confirm(`Удалить программу «${plan.title}»?`)) return
    const response = await fetch(`/api/training-plans/${plan.id}`, { method: 'DELETE' })
    if (!response.ok) return toast.error('Не удалось удалить')
    load()
  }

  return (
    <Card className="border-border/70 bg-card/80 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="f1-title text-xl">Программы обучения</h3>
          <p className="text-sm text-muted-foreground">Товары, которые покупатели выбирают в заявке</p>
        </div>
        <Button
          size="sm"
          className="bg-white text-black hover:bg-white/85"
          onClick={() => {
            setForm(empty)
            setOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Добавить
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="border-border/70 bg-black/20 p-4">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold">{plan.title}</h4>
              <Badge variant="outline" className={plan.active ? 'border-emerald-500/40 text-emerald-300' : 'border-white/20'}>
                {plan.active ? 'Активна' : 'Скрыта'}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{plan.duration}</p>
            <p className="f1-title mt-2 text-xl">{plan.price.toFixed(0)} ₽</p>
            <div className="mt-3 flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => openEdit(plan)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => remove(plan)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
        {plans.length === 0 && (
          <p className="text-sm text-muted-foreground">Программ пока нет — добавьте первую.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="f1-title text-2xl">
              {form.id ? 'Редактирование программы' : 'Новая программа'}
            </DialogTitle>
            <DialogDescription>Описание увидят покупатели на странице обучения.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pl-title">Название</Label>
              <Input id="pl-title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl-desc">Описание</Label>
              <Textarea id="pl-desc" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pl-price">Цена, ₽</Label>
                <Input id="pl-price" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pl-duration">Длительность</Label>
                <Input id="pl-duration" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pl-order">Порядок</Label>
                <Input id="pl-order" type="number" value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pl-features">Что входит (по одному пункту на строку)</Label>
              <Textarea id="pl-features" rows={4} value={form.features} onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))} />
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
    </Card>
  )
}
