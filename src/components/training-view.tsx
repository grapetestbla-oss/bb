'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Clock, GraduationCap, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { PaymentPicker } from '@/components/payment-picker'
import { CONTACT_TYPES, DEVICES, PLATFORMS } from '@/lib/f1-data'
import type { PaymentProvider } from '@/lib/payments'
import type { SessionUser } from '@/lib/auth'
import { cn } from '@/lib/utils'

type Plan = {
  id: string
  title: string
  description: string
  price: number
  duration: string
  features: string[]
}

export function TrainingView({
  plans,
  user,
  providers,
  manualInstructions,
}: {
  plans: Plan[]
  user: SessionUser | null
  providers: PaymentProvider[]
  manualInstructions: string
}) {
  const router = useRouter()
  const [planId, setPlanId] = useState<string>(plans[0]?.id ?? '')
  const [provider, setProvider] = useState<PaymentProvider>(providers[0] || 'manual')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    contactType: 'telegram',
    contact: user?.contact ?? '',
    platform: 'pc',
    device: 'wheel',
    level: '',
    comment: '',
  })

  const selected = plans.find((p) => p.id === planId)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return toast.error('Выберите программу обучения')
    if (!form.contact.trim()) return toast.error('Укажите контакт для связи')

    setLoading(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'training', planId, provider, form }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Не удалось отправить заявку')

      if (data.payUrl) {
        toast.success('Заявка создана, переходим к оплате…')
        window.location.href = data.payUrl
        return
      }
      toast.success('Заявка отправлена', {
        description: data.message || 'Администратор получил уведомление и скоро свяжется с вами.',
      })
      router.push('/profile')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка отправки')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="max-w-3xl">
        <Badge className="bg-[#e10600]/15 uppercase tracking-widest text-[#ff4d38]">Обучение</Badge>
        <h1 className="f1-title mt-4 text-4xl md:text-5xl">Тренировки с инженером</h1>
        <p className="mt-3 text-muted-foreground">
          Выберите программу, заполните анкету — и заявка попадёт напрямую в панель. После оплаты с
          вами свяжутся в Telegram или Discord.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            onClick={() => setPlanId(plan.id)}
            className={cn(
              'card-hover cursor-pointer border-border/70 bg-card/80 p-6',
              planId === plan.id && 'border-[#e10600] bg-[#e10600]/5'
            )}
          >
            <GraduationCap className="h-6 w-6 text-[#e10600]" />
            <h3 className="mt-3 text-xl font-bold">{plan.title}</h3>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {plan.duration}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e10600]" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="f1-title mt-5 text-3xl">{plan.price.toFixed(0)} ₽</div>
          </Card>
        ))}
        {plans.length === 0 && (
          <Card className="border-dashed border-border/70 bg-card/50 p-10 text-center text-muted-foreground md:col-span-3">
            Программы обучения пока не добавлены.
          </Card>
        )}
      </div>

      {plans.length > 0 && (
        <Card className="stripe-left mt-10 border-border/70 bg-card/80 p-6 md:p-8">
          <h2 className="f1-title text-2xl">Анкета для заявки</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Эти данные увидит тренер в панели, чтобы подготовиться к занятию.
          </p>

          {user ? (
            <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Способ связи</Label>
                  <div className="flex flex-wrap gap-2">
                    {CONTACT_TYPES.map((option) => (
                      <Option
                        key={option.value}
                        active={form.contactType === option.value}
                        onClick={() => setForm((f) => ({ ...f, contactType: option.value }))}
                      >
                        {option.label}
                      </Option>
                    ))}
                  </div>
                  <Input
                    value={form.contact}
                    onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                    placeholder={form.contactType === 'telegram' ? '@username' : 'username#0000'}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Платформа</Label>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((option) => (
                      <Option
                        key={option.value}
                        active={form.platform === option.value}
                        onClick={() => setForm((f) => ({ ...f, platform: option.value }))}
                      >
                        {option.label}
                      </Option>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Чем играете</Label>
                  <div className="flex flex-wrap gap-2">
                    {DEVICES.map((option) => (
                      <Option
                        key={option.value}
                        active={form.device === option.value}
                        onClick={() => setForm((f) => ({ ...f, device: option.value }))}
                      >
                        {option.label}
                      </Option>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="level">Ваш уровень / цель</Label>
                  <Input
                    id="level"
                    value={form.level}
                    onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                    placeholder="Например: гоняю в лиге, теряю время в медленных поворотах"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comment">Комментарий</Label>
                  <Textarea
                    id="comment"
                    rows={4}
                    value={form.comment}
                    onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                    placeholder="Удобное время, трассы для разбора, другие пожелания"
                  />
                </div>

                <PaymentPicker
                  providers={providers}
                  value={provider}
                  onChange={setProvider}
                  manualInstructions={manualInstructions}
                />

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Выбрано</p>
                    <p className="font-bold">{selected?.title}</p>
                  </div>
                  <span className="f1-title text-2xl">{selected?.price.toFixed(0)} ₽</span>
                </div>

                <Button type="submit" disabled={loading} size="lg" className="w-full bg-[#e10600] hover:bg-[#ff1a12]">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Отправить заявку и оплатить
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-md border border-dashed border-border/70 p-8 text-center">
              <p className="text-muted-foreground">
                Чтобы оставить заявку на обучение, войдите в аккаунт.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Button asChild className="bg-[#e10600] hover:bg-[#ff1a12]">
                  <Link href="/register">Регистрация</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/login">Вход</Link>
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

function Option({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border border-border/70 px-4 py-2 text-sm transition-colors hover:border-[#e10600]/60',
        active && 'border-[#e10600] bg-[#e10600]/15 text-[#ff6a5c]'
      )}
    >
      {children}
    </button>
  )
}
