'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AdminOrder } from '@/components/admin/types'

const FILTERS = [
  { value: '', label: 'Все' },
  { value: 'pending', label: 'Ожидают оплаты' },
  { value: 'paid', label: 'Оплачены' },
  { value: 'cancelled', label: 'Отменены' },
]

export function AdminOrders({ onChange }: { onChange?: () => void }) {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch(`/api/admin/orders${status ? `?status=${status}` : ''}`)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .catch(() => toast.error('Не удалось загрузить заказы'))
      .finally(() => setLoading(false))
  }, [status])

  useEffect(load, [load])

  const update = async (id: string, next: string) => {
    const response = await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (!response.ok) return toast.error('Не удалось изменить статус')
    toast.success(next === 'paid' ? 'Оплата подтверждена' : 'Статус обновлён')
    load()
    onChange?.()
  }

  const remove = async (id: string) => {
    if (!confirm('Удалить заказ?')) return
    const response = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' })
    if (!response.ok) return toast.error('Не удалось удалить заказ')
    load()
    onChange?.()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Badge
            key={filter.value}
            variant="outline"
            onClick={() => {
              setLoading(true)
              setStatus(filter.value)
            }}
            className={cn(
              'cursor-pointer px-3 py-1.5',
              status === filter.value && 'border-[#e10600] bg-[#e10600]/15 text-[#ff6a5c]'
            )}
          >
            {filter.label}
          </Badge>
        ))}
      </div>

      <Card className="gap-0 overflow-x-auto border-border/70 bg-card/80 p-0">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="carbon text-left uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Покупатель</th>
              <th className="px-4 py-3">Товар</th>
              <th className="px-4 py-3">Тип</th>
              <th className="px-4 py-3">Сумма</th>
              <th className="px-4 py-3">Оплата</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <div className="font-medium">{order.user.login}</div>
                  <div className="text-xs text-muted-foreground">{order.user.email}</div>
                </td>
                <td className="px-4 py-3">
                  {order.setup ? `${order.setup.track.flag} ${order.setup.title}` : order.plan?.title ?? '—'}
                </td>
                <td className="px-4 py-3">{order.kind === 'training' ? 'Обучение' : 'Сетап'}</td>
                <td className="px-4 py-3 font-mono">{order.amount.toFixed(0)} ₽</td>
                <td className="px-4 py-3">{order.provider ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      order.status === 'paid' && 'border-emerald-500/40 text-emerald-300',
                      order.status === 'pending' && 'border-amber-500/40 text-amber-300',
                      order.status === 'cancelled' && 'border-red-500/40 text-red-300'
                    )}
                  >
                    {order.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {order.status !== 'paid' && (
                      <Button size="sm" variant="ghost" className="text-emerald-400" onClick={() => update(order.id, 'paid')}>
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {order.status === 'pending' && (
                      <Button size="sm" variant="ghost" className="text-amber-400" onClick={() => update(order.id, 'cancelled')}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-red-400" onClick={() => remove(order.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Заказов нет.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
