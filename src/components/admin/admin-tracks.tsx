'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { PACKS, packLabel } from '@/lib/f1-data'
import type { AdminTrack } from '@/components/admin/types'

export function AdminTracks() {
  const [tracks, setTracks] = useState<AdminTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [form, setForm] = useState({
    name: '',
    slug: '',
    country: '',
    flag: '🏁',
    pack: 'f125',
    round: '0',
    laps: '0',
    lengthKm: '0',
  })

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/tracks')
      .then((r) => r.json())
      .then((d) => setTracks(d.tracks || []))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const seed = async () => {
    setSeeding(true)
    try {
      const response = await fetch('/api/seed', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Ошибка')
      toast.success(`Загружено трасс: ${data.tracks}, создано сетапов: ${data.setupsCreated}`)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка')
    } finally {
      setSeeding(false)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          round: Number(form.round),
          laps: Number(form.laps),
          lengthKm: Number(form.lengthKm),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось добавить трассу')
      toast.success('Трасса добавлена')
      setOpen(false)
      setForm({ name: '', slug: '', country: '', flag: '🏁', pack: 'f125', round: '0', laps: '0', lengthKm: '0' })
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={seed} disabled={seeding}>
          {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Загрузить трассы и сетапы F1 25 / 2026
        </Button>
        <Button onClick={() => setOpen(true)} className="ml-auto bg-white text-black hover:bg-white/85">
          <Plus className="mr-1.5 h-4 w-4" /> Добавить трассу
        </Button>
      </div>

      {loading ? (
        <Card className="p-10 text-center text-muted-foreground">Загрузка…</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => (
            <Card key={track.id} className="card-hover border-border/70 bg-card/80 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-2xl leading-none">{track.flag}</p>
                  <h3 className="mt-2 font-bold leading-snug">{track.name}</h3>
                  <p className="text-sm text-muted-foreground">{track.country}</p>
                </div>
                <Badge variant="outline" className="border-white/20 text-[10px] uppercase">
                  {packLabel(track.pack)}
                </Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Сетапов: {track._count?.setups ?? 0}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="f1-title text-2xl">Новая трасса</DialogTitle>
            <DialogDescription>Добавьте трассу, если её нет в стандартном списке игры.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="t-name">Название</Label>
                <Input id="t-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-slug">Slug (латиницей)</Label>
                <Input id="t-slug" required value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-country">Страна</Label>
                <Input id="t-country" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-flag">Флаг (эмодзи)</Label>
                <Input id="t-flag" value={form.flag} onChange={(e) => setForm((f) => ({ ...f, flag: e.target.value }))} />
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
                <Label htmlFor="t-round">Этап</Label>
                <Input id="t-round" type="number" value={form.round} onChange={(e) => setForm((f) => ({ ...f, round: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-laps">Кругов</Label>
                <Input id="t-laps" type="number" value={form.laps} onChange={(e) => setForm((f) => ({ ...f, laps: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-length">Длина, км</Label>
                <Input id="t-length" type="number" step="0.001" value={form.lengthKm} onChange={(e) => setForm((f) => ({ ...f, lengthKm: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Отмена</Button>
              <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-white/85">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Добавить
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
