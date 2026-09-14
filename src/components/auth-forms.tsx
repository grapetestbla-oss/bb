'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

async function post(url: string, payload: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Не удалось выполнить запрос')
  return data
}

export function LoginForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ login: '', password: '' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await post('/api/auth/login', form)
      toast.success('Добро пожаловать в F1 Icons League!')
      router.push(data.role === 'ADMIN' || data.role === 'SUPERADMIN' ? '/admin' : '/cabinet')
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login">Логин или email</Label>
        <Input
          id="login"
          autoComplete="username"
          value={form.login}
          onChange={(e) => setForm({ ...form, login: e.target.value })}
          placeholder="Ваш логин"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="••••••••"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Войти
      </Button>
    </form>
  )
}

export function RegisterForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    email: '',
    password: '',
    confirm: '',
    gameNick: '',
    platform: '',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Пароли не совпадают')
      return
    }
    setLoading(true)
    try {
      await post('/api/auth/register', form)
      toast.success('Аккаунт создан! Теперь подайте заявку в лигу.')
      router.push('/apply')
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="username">Логин *</Label>
          <Input
            id="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="latin_nick"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">Отображаемое имя</Label>
          <Input
            id="displayName"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="Как вас называть"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@example.com"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gameNick">Ник в F1 25</Label>
          <Input
            id="gameNick"
            value={form.gameNick}
            onChange={(e) => setForm({ ...form, gameNick: e.target.value })}
            placeholder="Игровой никнейм"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="platform">Платформа</Label>
          <Input
            id="platform"
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
            placeholder="PC / PS5 / Xbox"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reg-password">Пароль *</Label>
          <Input
            id="reg-password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="минимум 6 символов"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Повторите пароль *</Label>
          <Input
            id="confirm"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Создать аккаунт
      </Button>
    </form>
  )
}
