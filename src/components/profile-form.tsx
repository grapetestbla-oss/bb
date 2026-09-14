'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SessionUser } from '@/lib/auth'

export function ProfileForm({ user }: { user: SessionUser }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    displayName: user.displayName,
    email: user.email ?? '',
    gameNick: user.gameNick ?? '',
    platform: user.platform ?? '',
    country: user.country ?? '',
    bio: user.bio ?? '',
    avatar: user.avatar ?? '',
    currentPassword: '',
    newPassword: '',
  })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Не удалось сохранить профиль')
      toast.success('Профиль обновлён')
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }))
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="p-name">Отображаемое имя</Label>
          <Input id="p-name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-email">Email</Label>
          <Input id="p-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-nick">Ник в F1 25</Label>
          <Input id="p-nick" value={form.gameNick} onChange={(e) => setForm({ ...form, gameNick: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-platform">Платформа</Label>
          <Input id="p-platform" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-country">Страна / город</Label>
          <Input id="p-country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-avatar">Ссылка на аватар</Label>
          <Input id="p-avatar" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="https://..." />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="p-bio">О себе</Label>
        <Textarea id="p-bio" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
      </div>

      <div className="rounded-lg border border-border p-4">
        <div className="text-sm font-semibold">Смена пароля</div>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="p-current">Текущий пароль</Label>
            <Input
              id="p-current"
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-new">Новый пароль</Label>
            <Input
              id="p-new"
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Сохранить изменения
      </Button>
    </form>
  )
}
