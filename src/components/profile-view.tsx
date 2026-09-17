'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Bell, GraduationCap, Loader2, Package, Settings2, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SetupVariants } from '@/components/setup-variants'
import { deviceLabel, platformLabel, type SetupData } from '@/lib/f1-data'
import type { SessionUser } from '@/lib/auth'

type Order = {
  id: string
  kind: string
  amount: number
  status: string
  provider: string | null
  payUrl: string | null
  createdAt: string
  setup: {
    id: string
    title: string
    pilot: string
    track: { name: string; flag: string }
    variants: {
      id: string
      condition: string
      title: string
      notes: string
      data: Partial<SetupData> | null
    }[]
  } | null
  pack: { id: string; title: string; pilot: string; tracksCount: number } | null
  plan: { title: string; duration: string } | null
  training: {
    status: string
    platform: string
    device: string
    contact: string
    contactType: string
  } | null
}

type Notification = {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  createdAt: string
}

const STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Ожидает оплаты', className: 'bg-amber-500/15 text-amber-300 border-amber-500/40' },
  paid: { label: 'Оплачено', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  cancelled: { label: 'Отменён', className: 'bg-red-500/15 text-red-300 border-red-500/40' },
}

const TRAINING_STATUS: Record<string, string> = {
  new: 'В очереди',
  taken: 'Взята в работу',
  done: 'Завершено',
  cancelled: 'Отменена',
}

export function ProfileView({
  user,
  orders,
  notifications,
}: {
  user: SessionUser
  orders: Order[]
  notifications: Notification[]
}) {
  const purchases = orders.filter((o) => o.kind === 'setup' || o.kind === 'pack')
  const trainings = orders.filter((o) => o.kind === 'training')
  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="f1-title text-4xl">Личный кабинет</h1>
          <p className="mt-2 text-muted-foreground">
            {user.login} · {user.email}
            {user.role === 'admin' && (
              <Badge className="ml-2 bg-white text-black uppercase">Администратор</Badge>
            )}
          </p>
        </div>
        {user.role === 'admin' && (
          <Button asChild variant="outline" className="border-white/40 text-white/70">
            <Link href="/admin">
              <Shield className="mr-2 h-4 w-4" /> Панель управления
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="setups" className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="setups">
            <Package className="mr-1.5 h-4 w-4" /> Мои покупки ({purchases.length})
          </TabsTrigger>
          <TabsTrigger value="training">
            <GraduationCap className="mr-1.5 h-4 w-4" /> Обучение ({trainings.length})
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-1.5 h-4 w-4" /> Уведомления {unread > 0 && `(${unread})`}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings2 className="mr-1.5 h-4 w-4" /> Профиль
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setups" className="mt-6 space-y-4">
          {purchases.length === 0 && (
            <Card className="border-dashed border-border/70 bg-card/50 p-10 text-center">
              <p className="text-muted-foreground">Вы ещё не покупали сетапы и паки.</p>
              <Button asChild className="mx-auto mt-4 w-fit bg-white text-black hover:bg-white/85">
                <Link href="/catalog">В каталог</Link>
              </Button>
            </Card>
          )}
          {purchases.map((order) => (
            <Card key={order.id} className="stripe-left border-border/70 bg-card/80 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">
                    {order.setup
                      ? `${order.setup.track.flag} ${order.setup.track.name}`
                      : order.pack?.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {order.setup
                      ? `Пилот · ${order.setup.pilot}`
                      : `Пак · ${order.pack?.pilot} · ${order.pack?.tracksCount ?? 0} трасс`}{' '}
                    · {new Date(order.createdAt).toLocaleDateString('ru-RU')} ·{' '}
                    {order.amount.toFixed(0)} ₽
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS[order.status]?.className}>
                    {STATUS[order.status]?.label ?? order.status}
                  </Badge>
                  {order.status === 'pending' && order.payUrl && (
                    <Button asChild size="sm" className="bg-white text-black hover:bg-white/85">
                      <a href={order.payUrl} target="_blank" rel="noreferrer">Оплатить</a>
                    </Button>
                  )}
                </div>
              </div>

              {order.status === 'paid' && order.setup ? (
                <div className="mt-5">
                  <SetupVariants owned preview={{}} variants={order.setup.variants} />
                </div>
              ) : order.status === 'paid' && order.pack ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Пак открыт: все {order.pack.tracksCount} трасс доступны в каталоге со всеми
                  вариантами настроек.
                </p>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Параметры сетапа откроются сразу после подтверждения оплаты.
                </p>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="training" className="mt-6 space-y-4">
          {trainings.length === 0 && (
            <Card className="border-dashed border-border/70 bg-card/50 p-10 text-center">
              <p className="text-muted-foreground">Заявок на обучение пока нет.</p>
              <Button asChild className="mx-auto mt-4 w-fit bg-white text-black hover:bg-white/85">
                <Link href="/training">Оставить заявку</Link>
              </Button>
            </Card>
          )}
          {trainings.map((order) => (
            <Card key={order.id} className="stripe-left border-border/70 bg-card/80 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">{order.plan?.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {order.plan?.duration} · {new Date(order.createdAt).toLocaleDateString('ru-RU')} ·{' '}
                    {order.amount.toFixed(0)} ₽
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={STATUS[order.status]?.className}>
                    {STATUS[order.status]?.label ?? order.status}
                  </Badge>
                  {order.training && (
                    <Badge variant="outline" className="border-white/20">
                      {TRAINING_STATUS[order.training.status] ?? order.training.status}
                    </Badge>
                  )}
                  {order.status === 'pending' && order.payUrl && (
                    <Button asChild size="sm" className="bg-white text-black hover:bg-white/85">
                      <a href={order.payUrl} target="_blank" rel="noreferrer">Оплатить</a>
                    </Button>
                  )}
                </div>
              </div>
              {order.training && (
                <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                  <span>Связь: {order.training.contactType === 'telegram' ? 'Telegram' : 'Discord'} {order.training.contact}</span>
                  <span>Платформа: {platformLabel(order.training.platform)}</span>
                  <span>Устройство: {deviceLabel(order.training.device)}</span>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="notifications" className="mt-6 space-y-3">
          {notifications.length === 0 && (
            <Card className="border-dashed border-border/70 bg-card/50 p-10 text-center text-muted-foreground">
              Уведомлений пока нет.
            </Card>
          )}
          {notifications.map((n) => (
            <Card key={n.id} className="border-border/70 bg-card/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString('ru-RU')}
                </span>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <ProfileSettings user={user} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProfileSettings({ user }: { user: SessionUser }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    login: user.login,
    email: user.email,
    contact: user.contact ?? '',
    currentPassword: '',
    newPassword: '',
  })

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить')
      toast.success('Данные профиля обновлены')
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '' }))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-xl border-border/70 bg-card/80 p-6">
      <h2 className="f1-title text-2xl">Данные аккаунта</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Здесь можно сменить логин, email и пароль — включая учётную запись администратора.
      </p>
      <form onSubmit={save} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="p-login">Логин</Label>
          <Input id="p-login" value={form.login} onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-email">Email</Label>
          <Input id="p-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-contact">Telegram / Discord</Label>
          <Input id="p-contact" value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
        </div>
        <div className="h-px bg-border" />
        <div className="space-y-2">
          <Label htmlFor="p-current">Текущий пароль</Label>
          <Input
            id="p-current"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-new">Новый пароль</Label>
          <Input
            id="p-new"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
          />
        </div>
        <Button type="submit" disabled={loading} className="bg-white text-black hover:bg-white/85">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Сохранить
        </Button>
      </form>
    </Card>
  )
}
