'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  CalendarDays, ClipboardList, Flag, Loader2, Newspaper, RefreshCw, Trophy, Users, UsersRound,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import type { SessionUser } from '@/lib/auth'
import type { AdminOverview } from './types'
import { ApplicationsTab } from './applications-tab'
import { SeasonsTab } from './seasons-tab'
import { TeamsTab } from './teams-tab'
import { DriversTab } from './drivers-tab'
import { CalendarTab } from './calendar-tab'
import { ResultsTab } from './results-tab'
import { NewsTab } from './news-tab'
import { UsersTab } from './users-tab'

export function AdminPanel({ currentUser }: { currentUser: SessionUser }) {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async (targetSeason?: string | null) => {
      setLoading(true)
      try {
        const qs = targetSeason ? `?seasonId=${encodeURIComponent(targetSeason)}` : ''
        const res = await fetch(`/api/admin/overview${qs}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error ?? 'Не удалось загрузить данные')
        setData(json as AdminOverview)
        setSeasonId((json as AdminOverview).season?.id ?? null)
      } catch (err) {
        toast.error((err as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    void load()
  }, [load])

  const refresh = () => load(seasonId)

  if (!data) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Загрузка админ-панели…
      </div>
    )
  }

  const pending = data.applications.filter((a) => a.status === 'PENDING').length

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Сезон:</span>
          <Select
            value={data.season?.id ?? 'none'}
            onValueChange={(v) => {
              setSeasonId(v)
              void load(v)
            }}
          >
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Сезон не выбран" />
            </SelectTrigger>
            <SelectContent>
              {data.seasons.length ? (
                data.seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.isCurrent ? ' · текущий' : ''}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>Сезонов ещё нет</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
          Обновить
        </Button>

        <div className="ml-auto flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{data.entries.length} пилотов</Badge>
          <Badge variant="secondary">{data.teams.length} команд</Badge>
          <Badge variant="secondary">{data.races.length} этапов</Badge>
          {pending > 0 && <Badge>{pending} новых заявок</Badge>}
        </div>
      </div>

      <Tabs defaultValue="applications">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="applications" className="gap-1.5">
            <ClipboardList className="h-4 w-4" /> Заявки
            {pending > 0 && <span className="ml-1 rounded bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{pending}</span>}
          </TabsTrigger>
          <TabsTrigger value="seasons" className="gap-1.5"><Trophy className="h-4 w-4" /> Сезоны</TabsTrigger>
          <TabsTrigger value="teams" className="gap-1.5"><UsersRound className="h-4 w-4" /> Команды</TabsTrigger>
          <TabsTrigger value="drivers" className="gap-1.5"><Users className="h-4 w-4" /> Пилоты</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Календарь</TabsTrigger>
          <TabsTrigger value="results" className="gap-1.5"><Flag className="h-4 w-4" /> Результаты и зачёт</TabsTrigger>
          <TabsTrigger value="news" className="gap-1.5"><Newspaper className="h-4 w-4" /> Новости</TabsTrigger>
          <TabsTrigger value="users" className="gap-1.5"><Users className="h-4 w-4" /> Пользователи</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="applications"><ApplicationsTab data={data} refresh={refresh} /></TabsContent>
          <TabsContent value="seasons"><SeasonsTab data={data} refresh={refresh} onSelectSeason={(id) => load(id)} /></TabsContent>
          <TabsContent value="teams"><TeamsTab data={data} refresh={refresh} /></TabsContent>
          <TabsContent value="drivers"><DriversTab data={data} refresh={refresh} /></TabsContent>
          <TabsContent value="calendar"><CalendarTab data={data} refresh={refresh} /></TabsContent>
          <TabsContent value="results"><ResultsTab data={data} refresh={refresh} /></TabsContent>
          <TabsContent value="news"><NewsTab data={data} refresh={refresh} /></TabsContent>
          <TabsContent value="users"><UsersTab data={data} refresh={refresh} currentUser={currentUser} /></TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
