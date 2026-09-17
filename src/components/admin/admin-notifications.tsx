'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AdminNotification } from '@/components/admin/types'

export function AdminNotifications({ onChange }: { onChange?: () => void }) {
  const [items, setItems] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    fetch('/api/notifications?scope=admin')
      .then((r) => r.json())
      .then((d) => setItems(d.notifications || []))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  useEffect(load, [load])

  const markRead = async (id?: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, scope: 'admin' }),
    })
    load()
    onChange?.()
  }

  if (loading) return <Card className="p-10 text-center text-muted-foreground">Загрузка…</Card>

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => markRead()}>
          <CheckCheck className="mr-1.5 h-4 w-4" /> Отметить все прочитанными
        </Button>
      </div>

      {items.length === 0 && (
        <Card className="border-dashed border-border/70 bg-card/50 p-10 text-center text-muted-foreground">
          Уведомлений нет.
        </Card>
      )}

      {items.map((item) => (
        <Card
          key={item.id}
          className={cn('border-border/70 bg-card/80 p-4', !item.read && 'border-[#9d3f38]/50 bg-[#9d3f38]/5')}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">{item.title}</p>
                {!item.read && <Badge className="bg-[#9d3f38] text-[10px] uppercase">Новое</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {new Date(item.createdAt).toLocaleString('ru-RU')}
              </span>
              {item.link && (
                <Button asChild size="sm" variant="ghost" className="text-[#9d3f38]">
                  <Link href={item.link}>Открыть</Link>
                </Button>
              )}
              {!item.read && (
                <Button size="sm" variant="ghost" onClick={() => markRead(item.id)}>
                  Прочитано
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
