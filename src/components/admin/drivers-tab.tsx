'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ENTRY_STATUS } from '@/lib/format'
import { api, type AdminEntry, type AdminOverview } from './types'

export function DriversTab({ data, refresh }: { data: AdminOverview; refresh: () => void }) {
  const [userId, setUserId] = useState('')
  const [teamId, setTeamId] = useState('none')
  const [number, setNumber] = useState('')
  const [busy, setBusy] = useState(false)

  if (!data.season) {
    return <p className="surface p-8 text-center text-sm text-muted-foreground">Сначала создайте сезон во вкладке «Сезоны».</p>
  }

  const freeUsers = data.users.filter((u) => !data.entries.some((e) => e.userId === u.id))

  async function addDriver(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) {
      toast.error('Выберите пользователя')
      return
    }
    setBusy(true)
    try {
      await api('/api/admin/entries', 'POST', {
        seasonId: data.season!.id,
        userId,
        teamId: teamId === 'none' ? null : teamId,
        number: number ? Number(number) : undefined,
      })
      toast.success('Пилот добавлен в сезон')
      setUserId('')
      setNumber('')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={addDriver} className="surface grid gap-4 p-5 sm:grid-cols-[1.4fr_1fr_100px_auto] sm:items-end">
        <div className="space-y-2">
          <Label className="text-xs">Пользователь</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger><SelectValue placeholder="Выберите пользователя" /></SelectTrigger>
            <SelectContent>
              {freeUsers.length ? (
                freeUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.displayName} (@{u.username})
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>Все пользователи уже в сезоне</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Команда</Label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Без команды</SelectItem>
              {data.teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Номер</Label>
          <Input type="number" min={1} max={99} value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <Button type="submit" disabled={busy}><UserPlus className="mr-1.5 h-4 w-4" /> Добавить</Button>
      </form>

      {data.entries.length ? (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left">Пилот</th>
                <th className="px-3 py-3 text-left">Команда</th>
                <th className="px-3 py-3 text-left">Номер</th>
                <th className="px-3 py-3 text-left">Статус</th>
                <th className="px-3 py-3 text-left">Корректировка очков</th>
                <th className="px-3 py-3 text-right">Очки</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <DriverRow key={entry.id} entry={entry} data={data} refresh={refresh} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="surface p-8 text-center text-sm text-muted-foreground">
          В сезоне ещё нет пилотов. Одобрите заявки или добавьте участников вручную.
        </p>
      )}
    </div>
  )
}

function DriverRow({ entry, data, refresh }: { entry: AdminEntry; data: AdminOverview; refresh: () => void }) {
  const [busy, setBusy] = useState(false)
  const [number, setNumber] = useState(entry.number?.toString() ?? '')
  const [adjust, setAdjust] = useState(entry.pointsAdjust.toString())
  const standing = data.standings?.drivers.find((d) => d.entryId === entry.id)

  async function patch(payload: Record<string, unknown>, silent = false) {
    setBusy(true)
    try {
      await api(`/api/admin/entries/${entry.id}`, 'PATCH', payload)
      if (!silent) toast.success('Сохранено')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm(`Исключить ${entry.user.displayName} из сезона? Его результаты будут удалены.`)) return
    setBusy(true)
    try {
      await api(`/api/admin/entries/${entry.id}`, 'DELETE')
      toast.success('Пилот исключён из сезона')
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
        <div className="font-semibold">{entry.user.displayName}</div>
        <div className="text-xs text-muted-foreground">@{entry.user.username}</div>
      </td>
      <td className="px-3 py-2">
        <Select
          value={entry.teamId ?? 'none'}
          onValueChange={(v) => patch({ teamId: v === 'none' ? null : v })}
          disabled={busy}
        >
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Без команды</SelectItem>
            {data.teams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Input
          className="w-20"
          type="number"
          min={1}
          max={99}
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          onBlur={() => {
            if ((entry.number?.toString() ?? '') !== number) patch({ number: number || null }, true)
          }}
        />
      </td>
      <td className="px-3 py-2">
        <Select value={entry.status} onValueChange={(v) => patch({ status: v })} disabled={busy}>
          <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(ENTRY_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2">
        <Input
          className="w-24"
          type="number"
          value={adjust}
          onChange={(e) => setAdjust(e.target.value)}
          onBlur={() => {
            if (entry.pointsAdjust.toString() !== adjust) patch({ pointsAdjust: Number(adjust) || 0 }, true)
          }}
        />
      </td>
      <td className="px-3 py-2 text-right">
        <Badge variant="secondary" className="tabular-nums">{standing?.points ?? 0}</Badge>
      </td>
      <td className="px-3 py-2 text-right">
        <Button size="icon" variant="ghost" className="text-destructive" onClick={remove} disabled={busy}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  )
}
