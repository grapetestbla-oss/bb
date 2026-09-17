'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Bell,
  CreditCard,
  Flag,
  GraduationCap,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { AdminSetups } from '@/components/admin/admin-setups'
import { AdminOrders } from '@/components/admin/admin-orders'
import { AdminTrainings } from '@/components/admin/admin-trainings'
import { AdminPlans } from '@/components/admin/admin-plans'
import { AdminPayments } from '@/components/admin/admin-payments'
import { AdminUsers } from '@/components/admin/admin-users'
import { AdminNotifications } from '@/components/admin/admin-notifications'
import { AdminTracks } from '@/components/admin/admin-tracks'
import type { SessionUser } from '@/lib/auth'
import type { AdminOrder } from '@/components/admin/types'

type Stats = {
  users: number
  setups: number
  tracks: number
  paidOrders: number
  pendingOrders: number
  newTrainings: number
  revenue: number
}

export function AdminPanel({ user }: { user: SessionUser }) {
  const params = useSearchParams()
  const [tab, setTab] = useState(params.get('tab') || 'overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<AdminOrder[]>([])
  const [unread, setUnread] = useState(0)

  const loadStats = useCallback(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats || null)
        setRecent(d.recent || [])
      })
      .catch(() => undefined)
    fetch('/api/notifications?scope=admin')
      .then((r) => r.json())
      .then((d) => setUnread(d.unread || 0))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    loadStats()
    const timer = setInterval(loadStats, 30000)
    return () => clearInterval(timer)
  }, [loadStats])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="f1-title text-4xl">Панель управления</h1>
          <p className="mt-2 text-muted-foreground">
            Вы вошли как <span className="font-semibold text-foreground">{user.login}</span> ·
            изменить логин и пароль можно во вкладке «Профиль» личного кабинета
          </p>
        </div>
        {unread > 0 && (
          <Badge className="animate-pulse-red bg-[#9d3f38]">
            {unread} новых уведомлений
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-8">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview"><LayoutDashboard className="mr-1.5 h-4 w-4" />Обзор</TabsTrigger>
          <TabsTrigger value="setups"><Package className="mr-1.5 h-4 w-4" />Сетапы</TabsTrigger>
          <TabsTrigger value="tracks"><Flag className="mr-1.5 h-4 w-4" />Трассы</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingBag className="mr-1.5 h-4 w-4" />Заказы</TabsTrigger>
          <TabsTrigger value="training"><GraduationCap className="mr-1.5 h-4 w-4" />Обучение</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-1.5 h-4 w-4" />Пользователи</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="mr-1.5 h-4 w-4" />Платежи</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-1.5 h-4 w-4" />Уведомления</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Выручка', value: `${(stats?.revenue ?? 0).toFixed(0)} ₽` },
              { label: 'Оплаченных заказов', value: stats?.paidOrders ?? 0 },
              { label: 'Ожидают оплаты', value: stats?.pendingOrders ?? 0 },
              { label: 'Новых заявок на обучение', value: stats?.newTrainings ?? 0 },
              { label: 'Пользователей', value: stats?.users ?? 0 },
              { label: 'Сетапов', value: stats?.setups ?? 0 },
              { label: 'Трасс', value: stats?.tracks ?? 0 },
            ].map((item) => (
              <Card key={item.label} className="stripe-left gap-1 border-border/70 bg-card/80 p-5">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</span>
                <span className="f1-title text-3xl">{item.value}</span>
              </Card>
            ))}
          </div>

          <Card className="mt-6 gap-0 border-border/70 bg-card/80 p-0">
            <div className="carbon border-b border-border/70 px-5 py-3">
              <h3 className="font-bold uppercase tracking-wide">Последние заказы</h3>
            </div>
            <div className="divide-y divide-border/60">
              {recent.map((order) => (
                <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                  <span className="font-medium">{order.user.login}</span>
                  <span className="text-muted-foreground">
                    {order.setup ? `${order.setup.track.flag} ${order.setup.title}` : order.plan?.title}
                  </span>
                  <span className="font-mono">{order.amount.toFixed(0)} ₽</span>
                  <Badge variant="outline" className="border-white/20">{order.status}</Badge>
                </div>
              ))}
              {recent.length === 0 && (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">Заказов пока нет.</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="setups" className="mt-6"><AdminSetups /></TabsContent>
        <TabsContent value="tracks" className="mt-6"><AdminTracks /></TabsContent>
        <TabsContent value="orders" className="mt-6"><AdminOrders onChange={loadStats} /></TabsContent>
        <TabsContent value="training" className="mt-6 space-y-6">
          <AdminPlans />
          <AdminTrainings onChange={loadStats} />
        </TabsContent>
        <TabsContent value="users" className="mt-6"><AdminUsers /></TabsContent>
        <TabsContent value="payments" className="mt-6"><AdminPayments /></TabsContent>
        <TabsContent value="notifications" className="mt-6"><AdminNotifications onChange={loadStats} /></TabsContent>
      </Tabs>
    </div>
  )
}
