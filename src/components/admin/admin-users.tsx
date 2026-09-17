'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AdminUser } from '@/components/admin/types'

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => setUsers(d.users || []))
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Card className="p-10 text-center text-muted-foreground">Загрузка…</Card>

  return (
    <Card className="gap-0 overflow-x-auto border-border/70 bg-card/80 p-0">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="carbon text-left uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3">Логин</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Контакт</th>
            <th className="px-4 py-3">Роль</th>
            <th className="px-4 py-3">Заказов</th>
            <th className="px-4 py-3">Обучений</th>
            <th className="px-4 py-3">Регистрация</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-white/[0.03]">
              <td className="px-4 py-3 font-medium">{user.login}</td>
              <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
              <td className="px-4 py-3 text-muted-foreground">{user.contact || '—'}</td>
              <td className="px-4 py-3">
                <Badge variant="outline" className={user.role === 'admin' ? 'border-[#9d3f38]/60 text-[#d69a93]' : 'border-white/20'}>
                  {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </Badge>
              </td>
              <td className="px-4 py-3">{user._count.orders}</td>
              <td className="px-4 py-3">{user._count.trainingRequests}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString('ru-RU')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
