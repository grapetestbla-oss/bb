'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Lock, ShieldCheck, Trash2, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ROLE_LABEL, formatDate } from '@/lib/format'
import type { SessionUser } from '@/lib/auth'
import { api, type AdminOverview, type AdminUser } from './types'

export function UsersTab({
  data,
  refresh,
  currentUser,
}: {
  data: AdminOverview
  refresh: () => void
  currentUser: SessionUser
}) {
  const [query, setQuery] = useState('')
  const isSuper = currentUser.role === 'SUPERADMIN'

  const list = data.users.filter((u) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.gameNick ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      <div className="surface flex flex-wrap items-center gap-3 p-4">
        <Input
          className="max-w-sm"
          placeholder="Поиск по логину, имени, email или нику"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Badge variant="secondary">{data.users.length} пользователей</Badge>
        <Badge variant="outline">
          {data.users.filter((u) => u.role !== 'USER').length} администраторов
        </Badge>
        {!isSuper && (
          <span className="text-xs text-muted-foreground">
            Назначать администраторов может только главный администратор
          </span>
        )}
      </div>

      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-3 text-left">Пользователь</th>
              <th className="px-3 py-3 text-left">Контакты</th>
              <th className="px-3 py-3 text-left">Роль</th>
              <th className="px-3 py-3 text-left">Статус</th>
              <th className="px-3 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {list.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                refresh={refresh}
                isSuper={isSuper}
                isSelf={user.id === currentUser.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserRow({
  user,
  refresh,
  isSuper,
  isSelf,
}: {
  user: AdminUser
  refresh: () => void
  isSuper: boolean
  isSelf: boolean
}) {
  const [busy, setBusy] = useState(false)

  async function patch(payload: Record<string, unknown>, message: string) {
    setBusy(true)
    try {
      await api(`/api/admin/users/${user.id}`, 'PATCH', payload)
      toast.success(message)
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    const newPassword = prompt(`Новый пароль для ${user.displayName} (минимум 6 символов):`)
    if (!newPassword) return
    await patch({ newPassword }, 'Пароль изменён, активные сессии сброшены')
  }

  async function remove() {
    if (!confirm(`Удалить аккаунт ${user.displayName}? Будут удалены его заявки и участие в сезонах.`)) return
    setBusy(true)
    try {
      await api(`/api/admin/users/${user.id}`, 'DELETE')
      toast.success('Пользователь удалён')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-3 py-2">
        <div className="font-semibold">
          {user.displayName}
          {isSelf && <span className="ml-2 text-xs text-primary">это вы</span>}
        </div>
        <div className="text-xs text-muted-foreground">@{user.username} · с {formatDate(user.createdAt)}</div>
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        <div>{user.email ?? '—'}</div>
        <div className="text-xs">
          {user.gameNick ? `${user.gameNick}${user.platform ? ` · ${user.platform}` : ''}` : '—'}
        </div>
      </td>
      <td className="px-3 py-2">
        {isSuper ? (
          <Select
            value={user.role}
            onValueChange={(v) => patch({ role: v }, `Роль изменена: ${ROLE_LABEL[v] ?? v}`)}
            disabled={busy}
          >
            <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ROLE_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={user.role === 'USER' ? 'secondary' : 'default'}>
            {ROLE_LABEL[user.role] ?? user.role}
          </Badge>
        )}
      </td>
      <td className="px-3 py-2">
        {user.blocked ? (
          <Badge variant="destructive">Заблокирован</Badge>
        ) : (
          <Badge variant="secondary">Активен</Badge>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap justify-end gap-2">
          {user.role !== 'USER' && !isSuper && (
            <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> админ</Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => patch({ blocked: !user.blocked }, user.blocked ? 'Пользователь разблокирован' : 'Пользователь заблокирован')}
            disabled={busy || isSelf}
          >
            {user.blocked ? <Unlock className="mr-1.5 h-4 w-4" /> : <Lock className="mr-1.5 h-4 w-4" />}
            {user.blocked ? 'Разблокировать' : 'Блокировать'}
          </Button>
          <Button size="sm" variant="outline" onClick={resetPassword} disabled={busy}>
            <KeyRound className="mr-1.5 h-4 w-4" /> Пароль
          </Button>
          {isSuper && !isSelf && user.role !== 'SUPERADMIN' && (
            <Button size="icon" variant="ghost" className="text-destructive" onClick={remove} disabled={busy}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}
