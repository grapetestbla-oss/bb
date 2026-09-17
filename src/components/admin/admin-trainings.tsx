'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Gamepad2, MessageCircle, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { deviceLabel, platformLabel } from '@/lib/f1-data'
import { cn } from '@/lib/utils'
import type { AdminTraining } from '@/components/admin/types'

const FILTERS = [
  { value: '', label: 'Все' },
  { value: 'new', label: 'Новые' },
  { value: 'taken', label: 'В работе' },
  { value: 'done', label: 'Завершены' },
  { value: 'cancelled', label: 'Отменены' },
]

const STATUS_LABEL: Record<string, string> = {
  new: 'Новая',
  taken: 'В работе',
  done: 'Завершена',
  cancelled: 'Отменена',
}

export function AdminTrainings({ onChange }: { onChange?: () => void }) {
  const [requests, setRequests] = useState<AdminTraining[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch(`/api/admin/training${status ? `?status=${status}` : ''}`)
      .then((r) => r.json())
      .then((d) => setRequests(d.requests || []))
      .catch(() => toast.error('Не удалось загрузить заявки'))
      .finally(() => setLoading(false))
  }, [status])

  useEffect(load, [load])

  const update = async (id: string, next: string) => {
    const response = await fetch(`/api/admin/training/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    if (!response.ok) return toast.error('Не удалось обновить заявку')
    toast.success(next === 'taken' ? 'Заявка взята в работу' : 'Статус обновлён')
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
              status === filter.value && 'border-[#9d3f38] bg-[#9d3f38]/15 text-[#d69a93]'
            )}
          >
            {filter.label}
          </Badge>
        ))}
      </div>

      {loading && <Card className="p-10 text-center text-muted-foreground">Загрузка…</Card>}

      {!loading && requests.length === 0 && (
        <Card className="border-dashed border-border/70 bg-card/50 p-10 text-center text-muted-foreground">
          Заявок на обучение нет.
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {requests.map((request) => (
          <Card key={request.id} className="stripe-left border-border/70 bg-card/80 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold">{request.order.plan?.title ?? 'Обучение'}</h3>
                <p className="text-sm text-muted-foreground">
                  {request.user.login} · {request.user.email}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge
                  variant="outline"
                  className={cn(
                    request.status === 'new' && 'border-[#9d3f38]/60 text-[#d69a93]',
                    request.status === 'taken' && 'border-amber-500/40 text-amber-300',
                    request.status === 'done' && 'border-emerald-500/40 text-emerald-300'
                  )}
                >
                  {STATUS_LABEL[request.status] ?? request.status}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    request.order.status === 'paid'
                      ? 'border-emerald-500/40 text-emerald-300'
                      : 'border-amber-500/40 text-amber-300'
                  }
                >
                  {request.order.status === 'paid' ? 'Оплачено' : 'Ждёт оплаты'} ·{' '}
                  {request.order.amount.toFixed(0)} ₽
                </Badge>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm">
              <span className="inline-flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#9d3f38]" />
                {request.contactType === 'telegram' ? 'Telegram' : 'Discord'}: {request.contact}
              </span>
              <span className="inline-flex items-center gap-2">
                <Monitor className="h-4 w-4 text-[#9d3f38]" /> Платформа: {platformLabel(request.platform)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-[#9d3f38]" /> Устройство: {deviceLabel(request.device)}
              </span>
            </div>

            {request.level && (
              <p className="mt-3 text-sm">
                <span className="text-muted-foreground">Уровень / цель: </span>
                {request.level}
              </p>
            )}
            {request.comment && (
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">Комментарий: </span>
                {request.comment}
              </p>
            )}
            {request.takenBy && (
              <p className="mt-2 text-xs text-muted-foreground">Взял в работу: {request.takenBy.login}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {request.status === 'new' && (
                <Button size="sm" className="bg-[#9d3f38] hover:bg-[#b34d44]" onClick={() => update(request.id, 'taken')}>
                  Взять заявку
                </Button>
              )}
              {request.status === 'taken' && (
                <Button size="sm" variant="outline" onClick={() => update(request.id, 'done')}>
                  Завершить
                </Button>
              )}
              {request.status !== 'cancelled' && request.status !== 'done' && (
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => update(request.id, 'cancelled')}>
                  Отменить
                </Button>
              )}
              {(request.status === 'done' || request.status === 'cancelled') && (
                <Button size="sm" variant="ghost" onClick={() => update(request.id, 'new')}>
                  Вернуть в очередь
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
