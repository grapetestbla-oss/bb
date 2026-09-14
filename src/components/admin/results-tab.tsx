'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ListOrdered, Save, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatDateTime, positionClass } from '@/lib/format'
import { computeRacePoints } from '@/lib/points'
import { api, type AdminOverview } from './types'

type Row = {
  entryId: string
  position: string
  pole: boolean
  fastestLap: boolean
  dnf: boolean
  penalty: string
  points: string
}

export function ResultsTab({ data, refresh }: { data: AdminOverview; refresh: () => void }) {
  const [raceId, setRaceId] = useState<string>(data.races[0]?.id ?? '')
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)

  const race = data.races.find((r) => r.id === raceId) ?? null

  useEffect(() => {
    if (!data.races.some((r) => r.id === raceId)) setRaceId(data.races[0]?.id ?? '')
  }, [data.races, raceId])

  useEffect(() => {
    if (!race) {
      setRows([])
      return
    }
    setRows(
      data.entries.map((entry) => {
        const result = race.results.find((r) => r.entryId === entry.id)
        return {
          entryId: entry.id,
          position: result?.position?.toString() ?? '',
          pole: result?.pole ?? false,
          fastestLap: result?.fastestLap ?? false,
          dnf: result?.dnf ?? false,
          penalty: result?.penalty ? String(result.penalty) : '',
          points: result ? String(result.points) : '',
        }
      }),
    )
  }, [raceId, race, data.entries])

  const season = data.season

  const preview = useMemo(() => {
    if (!season) return new Map<string, number>()
    return new Map(
      rows.map((row) => [
        row.entryId,
        computeRacePoints(
          {
            position: row.position ? Number(row.position) : null,
            pole: row.pole,
            fastestLap: row.fastestLap,
            dnf: row.dnf,
            penalty: Number(row.penalty) || 0,
          },
          season,
        ),
      ]),
    )
  }, [rows, season])

  if (!season) {
    return <p className="surface p-8 text-center text-sm text-muted-foreground">Сначала создайте сезон во вкладке «Сезоны».</p>
  }

  if (!data.races.length) {
    return <p className="surface p-8 text-center text-sm text-muted-foreground">Добавьте этапы в календарь, чтобы вносить результаты.</p>
  }

  function update(entryId: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.entryId === entryId ? { ...r, ...patch } : r)))
  }

  /** Расставить позиции 1..N по текущему порядку строк (для быстрого ввода). */
  function autoNumber() {
    let pos = 1
    setRows((prev) =>
      prev.map((r) => (r.dnf ? { ...r, position: '' } : { ...r, position: String(pos++) })),
    )
    toast.info('Позиции расставлены по порядку — поправьте вручную при необходимости')
  }

  function clearAll() {
    setRows((prev) =>
      prev.map((r) => ({ ...r, position: '', pole: false, fastestLap: false, dnf: false, penalty: '', points: '' })),
    )
  }

  async function save() {
    setBusy(true)
    try {
      await api(`/api/admin/races/${raceId}/results`, 'PUT', {
        results: rows
          .filter((r) => r.position || r.dnf || r.pole || r.fastestLap || r.points)
          .map((r) => ({
            entryId: r.entryId,
            position: r.position ? Number(r.position) : null,
            pole: r.pole,
            fastestLap: r.fastestLap,
            dnf: r.dnf,
            penalty: Number(r.penalty) || 0,
            points: r.points === '' ? null : Number(r.points),
          })),
      })
      toast.success('Протокол сохранён, таблица зачёта пересчитана')
      refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const sortedRows = [...rows].sort((a, b) => {
    const pa = a.position ? Number(a.position) : 999
    const pb = b.position ? Number(b.position) : 999
    return pa - pb
  })

  const entryById = new Map(data.entries.map((e) => [e.id, e]))

  return (
    <div className="space-y-5">
      <div className="surface flex flex-wrap items-end gap-4 p-5">
        <div className="min-w-[280px] flex-1 space-y-2">
          <Label className="text-xs">Этап</Label>
          <Select value={raceId} onValueChange={setRaceId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {data.races.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  Этап {r.round} · {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {race && (
          <div className="text-sm text-muted-foreground">
            {race.track} · {formatDateTime(race.date)}
          </div>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={autoNumber}><Wand2 className="mr-1.5 h-4 w-4" /> Авто-позиции</Button>
          <Button size="sm" variant="ghost" onClick={clearAll}>Очистить</Button>
          <Button size="sm" onClick={save} disabled={busy}><Save className="mr-1.5 h-4 w-4" /> Сохранить протокол</Button>
        </div>
      </div>

      {data.entries.length ? (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3 text-left">Поз.</th>
                <th className="px-3 py-3 text-left">Пилот</th>
                <th className="px-3 py-3 text-left">Команда</th>
                <th className="px-3 py-3 text-center">Поул</th>
                <th className="px-3 py-3 text-center">Быстрый круг</th>
                <th className="px-3 py-3 text-center">DNF</th>
                <th className="px-3 py-3 text-center">Штраф (очки)</th>
                <th className="px-3 py-3 text-right">Очки</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const entry = entryById.get(row.entryId)
                if (!entry) return null
                const auto = preview.get(row.entryId) ?? 0
                return (
                  <tr key={row.entryId} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      <Input
                        className="w-16"
                        type="number"
                        min={1}
                        value={row.position}
                        onChange={(e) => update(row.entryId, { position: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {row.position && <span className={positionClass(Number(row.position))}>{row.position}</span>}
                        <div>
                          <div className="font-semibold">{entry.user.displayName}</div>
                          <div className="text-xs text-muted-foreground">@{entry.user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {entry.team ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="h-3 w-1 rounded-full" style={{ background: entry.team.color }} />
                          {entry.team.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Checkbox checked={row.pole} onCheckedChange={(v) => update(row.entryId, { pole: !!v })} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Checkbox checked={row.fastestLap} onCheckedChange={(v) => update(row.entryId, { fastestLap: !!v })} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Checkbox checked={row.dnf} onCheckedChange={(v) => update(row.entryId, { dnf: !!v })} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Input
                        className="mx-auto w-20"
                        type="number"
                        value={row.penalty}
                        onChange={(e) => update(row.entryId, { penalty: e.target.value })}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          className="w-24 text-right"
                          type="number"
                          step="0.5"
                          value={row.points}
                          onChange={(e) => update(row.entryId, { points: e.target.value })}
                          placeholder={String(auto)}
                        />
                        <Badge variant="secondary" className="tabular-nums" title="Автоматический расчёт">{auto}</Badge>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="surface p-8 text-center text-sm text-muted-foreground">В сезоне нет пилотов — добавьте их во вкладке «Пилоты».</p>
      )}

      <div className="surface p-5">
        <h3 className="flex items-center gap-2 text-base font-bold">
          <ListOrdered className="h-4 w-4 text-primary" /> Как считаются очки
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Очки начисляются автоматически по системе сезона ({season.pointsSystem}, быстрый круг +{season.fastestLapPoint},
          поул +{season.polePoint}) за вычетом штрафа. Значение в поле «Очки» переопределяет расчёт вручную — оставьте
          поле пустым, чтобы использовать автоматический результат. Дополнительные штрафы и бонусы по сезону в целом
          задаются во вкладках «Пилоты» и «Команды».
        </p>
      </div>
    </div>
  )
}
