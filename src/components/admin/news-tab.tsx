'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Eye, EyeOff, Pin, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { formatDateTime } from '@/lib/format'
import { api, type AdminNews, type AdminOverview } from './types'

const emptyDraft = { title: '', excerpt: '', content: '', cover: '', published: true, pinned: false }

export function NewsTab({ data, refresh }: { data: AdminOverview; refresh: () => void }) {
  const [draft, setDraft] = useState(emptyDraft)
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/api/admin/news', 'POST', draft)
      toast.success('Новость опубликована')
      setDraft(emptyDraft)
      setCreating(false)
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Новости лиги</h2>
        <Button size="sm" onClick={() => setCreating((v) => !v)}>
          <Plus className="mr-1.5 h-4 w-4" /> Новая новость
        </Button>
      </div>

      {creating && (
        <form onSubmit={create} className="surface space-y-4 p-5">
          <div className="space-y-2">
            <Label className="text-xs">Заголовок *</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Краткое описание</Label>
            <Input value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} placeholder="Показывается в списке новостей" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Текст *</Label>
            <Textarea rows={7} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Обложка (ссылка на изображение)</Label>
            <Input value={draft.cover} onChange={(e) => setDraft({ ...draft, cover: e.target.value })} placeholder="https://..." />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.published} onCheckedChange={(v) => setDraft({ ...draft, published: v })} />
              Опубликована
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={draft.pinned} onCheckedChange={(v) => setDraft({ ...draft, pinned: v })} />
              Закрепить сверху
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>Опубликовать</Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Отмена</Button>
          </div>
        </form>
      )}

      {data.news.length ? (
        <div className="space-y-3">
          {data.news.map((item) => (
            <NewsCard key={item.id} item={item} refresh={refresh} />
          ))}
        </div>
      ) : (
        <p className="surface p-8 text-center text-sm text-muted-foreground">Новостей пока нет.</p>
      )}
    </div>
  )
}

function NewsCard({ item, refresh }: { item: AdminNews; refresh: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    title: item.title,
    excerpt: item.excerpt ?? '',
    content: item.content,
    cover: item.cover ?? '',
  })

  async function patch(payload: Record<string, unknown>) {
    setBusy(true)
    try {
      await api(`/api/admin/news/${item.id}`, 'PATCH', payload)
      toast.success('Новость обновлена')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`Удалить новость «${item.title}»?`)) return
    setBusy(true)
    try {
      await api(`/api/admin/news/${item.id}`, 'DELETE')
      toast.success('Новость удалена')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold">{item.title}</h3>
            {item.pinned && <Badge variant="outline" className="border-primary/40 text-primary">Закреплена</Badge>}
            <Badge variant={item.published ? 'secondary' : 'destructive'}>
              {item.published ? 'Опубликована' : 'Черновик'}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.createdAt)} · /news/{item.slug}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => patch({ published: !item.published })} disabled={busy}>
            {item.published ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Eye className="mr-1.5 h-4 w-4" />}
            {item.published ? 'Скрыть' : 'Опубликовать'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => patch({ pinned: !item.pinned })} disabled={busy}>
            <Pin className="mr-1.5 h-4 w-4" /> {item.pinned ? 'Открепить' : 'Закрепить'}
          </Button>
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
          <div className="space-y-2">
            <Label className="text-xs">Заголовок</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Краткое описание</Label>
            <Input value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Текст</Label>
            <Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Обложка</Label>
            <Input value={form.cover} onChange={(e) => setForm({ ...form, cover: e.target.value })} />
          </div>
          <Button size="sm" onClick={() => patch(form)} disabled={busy}>
            <Save className="mr-1.5 h-4 w-4" /> Сохранить
          </Button>
        </div>
      )}
    </div>
  )
}
