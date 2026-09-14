'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { APPLICATION_STATUS, formatDateTime } from '@/lib/format'
import { api, type AdminApplication, type AdminOverview } from './types'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
}

export function ApplicationsTab({ data, refresh }: { data: AdminOverview; refresh: () => void }) {
  const [filter, setFilter] = useState('PENDING')
  const list = data.applications.filter((a) => (filter === 'ALL' ? true : a.status === filter))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'PENDING', label: 'На рассмотрении' },
          { key: 'APPROVED', label: 'Одобренные' },
          { key: 'REJECTED', label: 'Отклонённые' },
          { key: 'ALL', label: 'Все' },
        ].map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? 'default' : 'outline'}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-70">
              {f.key === 'ALL' ? data.applications.length : data.applications.filter((a) => a.status === f.key).length}
            </span>
          </Button>
        ))}
      </div>

      {list.length ? (
        <div className="space-y-3">
          {list.map((app) => (
            <ApplicationCard key={app.id} app={app} data={data} refresh={refresh} />
          ))}
        </div>
      ) : (
        <p className="surface p-8 text-center text-sm text-muted-foreground">Заявок в этой категории нет.</p>
      )}
    </div>
  )
}

function ApplicationCard({
  app,
  data,
  refresh,
}: {
  app: AdminApplication
  data: AdminOverview
  refresh: () => void
}) {
  const [teamId, setTeamId] = useState<string>('none')
  const [number, setNumber] = useState('')
  const [comment, setComment] = useState(app.adminComment ?? '')
  const [busy, setBusy] = useState(false)

  async function review(status: 'APPROVED' | 'REJECTED' | 'PENDING') {
    setBusy(true)
    try {
      await api(`/api/admin/applications/${app.id}`, 'PATCH', {
        status,
        adminComment: comment,
        teamId: teamId === 'none' ? null : teamId,
        number: number ? Number(number) : undefined,
        seasonId: data.season?.id,
      })
      toast.success(
        status === 'APPROVED' ? 'Заявка одобрена, пилот добавлен в сезон' :
        status === 'REJECTED' ? 'Заявка отклонена' : 'Заявка возвращена на рассмотрение',
      )
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Удалить заявку безвозвратно?')) return
    setBusy(true)
    try {
      await api(`/api/admin/applications/${app.id}`, 'DELETE')
      toast.success('Заявка удалена')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold">{app.user.displayName}</span>
            <span className="text-sm text-muted-foreground">@{app.user.username}</span>
            <Badge variant={statusVariant[app.status] ?? 'secondary'}>
              {APPLICATION_STATUS[app.status] ?? app.status}
            </Badge>
            {app.season && <Badge variant="outline">{app.season.name}</Badge>}
          </div>
          <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <div>Ник в игре: <span className="font-semibold">{app.gameNick}</span></div>
            <div>Платформа: <span className="font-semibold">{app.platform}</span></div>
            {app.psnId && <div>ID аккаунта: <span className="font-semibold">{app.psnId}</span></div>}
            {app.age && <div>Возраст: <span className="font-semibold">{app.age}</span></div>}
            {app.availability && <div>Время: <span className="font-semibold">{app.availability}</span></div>}
            {app.preferredTeam && <div>Желаемая команда: <span className="font-semibold">{app.preferredTeam}</span></div>}
            {app.user.email && <div>Email: <span className="font-semibold">{app.user.email}</span></div>}
          </div>
          {app.experience && (
            <p className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Опыт: </span>{app.experience}
            </p>
          )}
          {app.about && (
            <p className="mt-2 rounded-md bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">О себе: </span>{app.about}
            </p>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>Подана {formatDateTime(app.createdAt)}</div>
          {app.reviewer && app.reviewedAt && (
            <div className="mt-1">Рассмотрел {app.reviewer.displayName}, {formatDateTime(app.reviewedAt)}</div>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_120px]">
        <div className="space-y-2">
          <Label className="text-xs">Команда при одобрении</Label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger><SelectValue placeholder="Без команды" /></SelectTrigger>
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
          <Input type="number" min={1} max={99} value={number} onChange={(e) => setNumber(e.target.value)} placeholder="—" />
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <Label className="text-xs">Комментарий для пилота</Label>
        <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Виден пилоту в личном кабинете" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {app.status !== 'APPROVED' && (
          <Button size="sm" onClick={() => review('APPROVED')} disabled={busy}>
            <Check className="mr-1.5 h-4 w-4" /> Одобрить и добавить в сезон
          </Button>
        )}
        {app.status !== 'REJECTED' && (
          <Button size="sm" variant="destructive" onClick={() => review('REJECTED')} disabled={busy}>
            <X className="mr-1.5 h-4 w-4" /> Отклонить
          </Button>
        )}
        {app.status !== 'PENDING' && (
          <Button size="sm" variant="outline" onClick={() => review('PENDING')} disabled={busy}>
            Вернуть на рассмотрение
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={remove} disabled={busy} className="ml-auto text-destructive">
          <Trash2 className="mr-1.5 h-4 w-4" /> Удалить
        </Button>
      </div>
    </div>
  )
}
