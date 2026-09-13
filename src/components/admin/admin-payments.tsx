'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import type { PaymentsForm } from '@/components/admin/types'

const EMPTY: PaymentsForm = {
  freekassa: { enabled: false, merchantId: '', secret1: '', secret2: '', currency: 'RUB' },
  platega: { enabled: false, merchantId: '', secret: '', paymentMethod: 2, currency: 'RUB' },
  manual: { enabled: true, instructions: '' },
}

export function AdminPayments() {
  const [form, setForm] = useState<PaymentsForm>(EMPTY)
  const [origin, setOrigin] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.payments) setForm({ ...EMPTY, ...d.payments })
      })
      .catch(() => toast.error('Не удалось загрузить настройки'))
      .finally(() => setLoading(false))
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: form }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось сохранить')
      toast.success('Настройки платёжных систем сохранены')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Card className="p-10 text-center text-muted-foreground">Загрузка…</Card>

  return (
    <form onSubmit={save} className="space-y-5">
      {/* FreeKassa */}
      <Card className="stripe-left border-border/70 bg-card/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="f1-title text-xl">FreeKassa</h3>
            <p className="text-sm text-muted-foreground">Карты, СБП и электронные кошельки</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.freekassa.enabled}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, freekassa: { ...f.freekassa, enabled: v } }))
              }
            />
            {form.freekassa.enabled ? 'Подключена' : 'Отключена'}
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fk-merchant">ID магазина (m)</Label>
            <Input
              id="fk-merchant"
              value={form.freekassa.merchantId}
              onChange={(e) => setForm((f) => ({ ...f, freekassa: { ...f.freekassa, merchantId: e.target.value } }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fk-currency">Валюта</Label>
            <Input
              id="fk-currency"
              value={form.freekassa.currency}
              onChange={(e) => setForm((f) => ({ ...f, freekassa: { ...f.freekassa, currency: e.target.value } }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fk-secret1">Секретное слово 1</Label>
            <Input
              id="fk-secret1"
              type="password"
              value={form.freekassa.secret1}
              onChange={(e) => setForm((f) => ({ ...f, freekassa: { ...f.freekassa, secret1: e.target.value } }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fk-secret2">Секретное слово 2 (для уведомлений)</Label>
            <Input
              id="fk-secret2"
              type="password"
              value={form.freekassa.secret2}
              onChange={(e) => setForm((f) => ({ ...f, freekassa: { ...f.freekassa, secret2: e.target.value } }))}
            />
          </div>
        </div>

        <div className="mt-4 rounded-md border border-border/70 bg-black/20 p-3 text-sm">
          <p className="text-muted-foreground">URL уведомления (укажите в кабинете FreeKassa):</p>
          <code className="mt-1 block break-all font-mono text-xs text-[#ff6a5c]">
            {origin}/api/payments/freekassa
          </code>
        </div>
      </Card>

      {/* Platega */}
      <Card className="stripe-left border-border/70 bg-card/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="f1-title text-xl">Platega</h3>
            <p className="text-sm text-muted-foreground">Приём платежей по API</p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.platega.enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, platega: { ...f.platega, enabled: v } }))}
            />
            {form.platega.enabled ? 'Подключена' : 'Отключена'}
          </label>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pl-merchant">Merchant ID</Label>
            <Input
              id="pl-merchant"
              value={form.platega.merchantId}
              onChange={(e) => setForm((f) => ({ ...f, platega: { ...f.platega, merchantId: e.target.value } }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pl-secret">Secret</Label>
            <Input
              id="pl-secret"
              type="password"
              value={form.platega.secret}
              onChange={(e) => setForm((f) => ({ ...f, platega: { ...f.platega, secret: e.target.value } }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pl-method">Способ оплаты (paymentMethod)</Label>
            <Input
              id="pl-method"
              type="number"
              value={form.platega.paymentMethod}
              onChange={(e) =>
                setForm((f) => ({ ...f, platega: { ...f.platega, paymentMethod: Number(e.target.value) } }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pl-currency">Валюта</Label>
            <Input
              id="pl-currency"
              value={form.platega.currency}
              onChange={(e) => setForm((f) => ({ ...f, platega: { ...f.platega, currency: e.target.value } }))}
            />
          </div>
        </div>

        <div className="mt-4 rounded-md border border-border/70 bg-black/20 p-3 text-sm">
          <p className="text-muted-foreground">Webhook для статусов транзакций:</p>
          <code className="mt-1 block break-all font-mono text-xs text-[#ff6a5c]">
            {origin}/api/payments/platega
          </code>
        </div>
      </Card>

      {/* Ручная оплата */}
      <Card className="stripe-left border-border/70 bg-card/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="f1-title text-xl">Ручная оплата</h3>
            <p className="text-sm text-muted-foreground">
              Заказ создаётся со статусом «ожидает оплаты», вы подтверждаете его во вкладке «Заказы»
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.manual.enabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, manual: { ...f.manual, enabled: v } }))}
            />
            {form.manual.enabled ? 'Включена' : 'Выключена'}
          </label>
        </div>
        <div className="mt-5 space-y-2">
          <Label htmlFor="manual-text">Инструкция для покупателя</Label>
          <Textarea
            id="manual-text"
            rows={3}
            value={form.manual.instructions}
            onChange={(e) => setForm((f) => ({ ...f, manual: { ...f.manual, instructions: e.target.value } }))}
          />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving} className="bg-[#e10600] hover:bg-[#ff1a12]">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Сохранить настройки
        </Button>
        <Badge variant="outline" className="border-white/20 text-muted-foreground">
          Секретные ключи хранятся на сервере и не отдаются покупателям
        </Badge>
      </div>
    </form>
  )
}
