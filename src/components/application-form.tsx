'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const PLATFORMS = ['PC (Steam/EA App)', 'PlayStation 5', 'Xbox Series X|S']

export function ApplicationForm({
  seasonId,
  seasonName,
  teams,
  defaults,
}: {
  seasonId: string | null
  seasonName: string | null
  teams: { id: string; name: string }[]
  defaults: { gameNick: string; platform: string }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    gameNick: defaults.gameNick,
    platform: defaults.platform || PLATFORMS[0],
    psnId: '',
    age: '',
    experience: '',
    availability: '',
    preferredTeam: '',
    about: '',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, seasonId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Не удалось отправить заявку')
      toast.success('Заявка отправлена на рассмотрение!')
      router.refresh()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {seasonName && (
        <p className="text-sm text-muted-foreground">
          Заявка подаётся в сезон <span className="font-semibold text-foreground">{seasonName}</span>.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="gameNick">Игровой никнейм *</Label>
          <Input
            id="gameNick"
            value={form.gameNick}
            onChange={(e) => setForm({ ...form, gameNick: e.target.value })}
            placeholder="Ник в F1 25"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Платформа *</Label>
          <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
            <SelectTrigger><SelectValue placeholder="Выберите платформу" /></SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="psnId">ID аккаунта (PSN / Steam / Xbox)</Label>
          <Input
            id="psnId"
            value={form.psnId}
            onChange={(e) => setForm({ ...form, psnId: e.target.value })}
            placeholder="Для добавления в лобби"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="age">Возраст</Label>
          <Input
            id="age"
            type="number"
            min={10}
            max={80}
            value={form.age}
            onChange={(e) => setForm({ ...form, age: e.target.value })}
            placeholder="18"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="experience">Опыт в симрейсинге</Label>
        <Textarea
          id="experience"
          rows={3}
          value={form.experience}
          onChange={(e) => setForm({ ...form, experience: e.target.value })}
          placeholder="В каких лигах выступали, сколько сезонов, лучшие результаты, настройки помощи (ABS/TC)"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="availability">Удобное время для гонок</Label>
          <Input
            id="availability"
            value={form.availability}
            onChange={(e) => setForm({ ...form, availability: e.target.value })}
            placeholder="Например: будни после 20:00 МСК"
          />
        </div>
        <div className="space-y-2">
          <Label>Желаемая команда</Label>
          {teams.length ? (
            <Select
              value={form.preferredTeam || 'any'}
              onValueChange={(v) => setForm({ ...form, preferredTeam: v === 'any' ? '' : v })}
            >
              <SelectTrigger><SelectValue placeholder="Не важно" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Не важно</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={form.preferredTeam}
              onChange={(e) => setForm({ ...form, preferredTeam: e.target.value })}
              placeholder="Название команды"
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="about">О себе</Label>
        <Textarea
          id="about"
          rows={4}
          value={form.about}
          onChange={(e) => setForm({ ...form, about: e.target.value })}
          placeholder="Пара слов о себе, контакт в Telegram/Discord для связи"
        />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Отправить заявку
      </Button>
    </form>
  )
}
