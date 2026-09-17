'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ login: '', email: '', password: '', contact: '' })

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Ошибка')
      toast.success(mode === 'login' ? 'С возвращением в паддок!' : 'Аккаунт создан')
      router.push(data.user?.role === 'admin' ? '/admin' : '/profile')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex w-fit items-center gap-2 lights-out">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className="on" />
          ))}
        </div>
        <h1 className="f1-title text-3xl">
          {mode === 'login' ? 'Вход в гараж' : 'Регистрация пилота'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === 'login'
            ? 'Войдите, чтобы открыть купленные сетапы'
            : 'Создайте аккаунт, чтобы покупать сетапы и записываться на обучение'}
        </p>
      </div>

      <Card className="stripe-left border-border/70 bg-card/80 p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login">{mode === 'login' ? 'Логин или email' : 'Логин'}</Label>
            <Input id="login" value={form.login} onChange={update('login')} required autoComplete="username" />
          </div>

          {mode === 'register' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={update('email')} required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Telegram / Discord (необязательно)</Label>
                <Input id="contact" value={form.contact} onChange={update('contact')} placeholder="@username" />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={update('password')}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-white/85">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <>
              Нет аккаунта?{' '}
              <Link href="/register" className="text-white hover:underline">
                Зарегистрироваться
              </Link>
            </>
          ) : (
            <>
              Уже есть аккаунт?{' '}
              <Link href="/login" className="text-white hover:underline">
                Войти
              </Link>
            </>
          )}
        </p>
      </Card>
    </div>
  )
}
