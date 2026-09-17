import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Flag, Gauge, ShieldCheck, TrendingUp } from 'lucide-react'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SetupValues } from '@/components/setup-values'
import { BuyPanel } from '@/components/buy-panel'
import { packLabel, typeLabel, type SetupData } from '@/lib/f1-data'
import { parseJson } from '@/lib/api'
import { availableProviders } from '@/lib/payments'
import { getPaymentSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export default async function SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [setup, user] = await Promise.all([
    db.setup.findUnique({ where: { id }, include: { track: true } }),
    getCurrentUser(),
  ])
  if (!setup || (!setup.active && user?.role !== 'admin')) notFound()

  const owned =
    user?.role === 'admin' ||
    (user
      ? Boolean(await db.order.findFirst({ where: { userId: user.id, setupId: setup.id, status: 'paid' } }))
      : false)

  const [providers, payments] = await Promise.all([availableProviders(), getPaymentSettings()])

  const full = parseJson<Partial<SetupData>>(setup.data, {})
  const preview = parseJson<Partial<SetupData>>(setup.previewData, {})

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-6 text-muted-foreground">
        <Link href="/catalog">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Назад в каталог
        </Link>
      </Button>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-white/20 uppercase">{packLabel(setup.pack)}</Badge>
            <Badge className="bg-[#9d3f38] uppercase">{typeLabel(setup.type)}</Badge>
            {setup.featured && <Badge variant="outline" className="border-amber-400/60 text-amber-300">Хит продаж</Badge>}
          </div>

          <h1 className="f1-title mt-4 text-4xl leading-tight md:text-5xl">
            {setup.track.flag} {setup.track.name}
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">{setup.title}</p>

          <div className="mt-6 flex flex-wrap gap-5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Flag className="h-4 w-4 text-[#9d3f38]" /> {setup.track.country}
            </span>
            {setup.track.laps > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-[#9d3f38]" /> {setup.track.laps} кругов ·{' '}
                {setup.track.lengthKm.toFixed(3)} км
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-[#9d3f38]" /> {setup.sales} продаж
            </span>
          </div>

          <Card className="mt-6 border-border/70 bg-card/70 p-6">
            <h2 className="text-lg font-bold">Описание</h2>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{setup.description}</p>
          </Card>

          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="f1-title text-2xl">Параметры сетапа</h2>
              {!owned && (
                <span className="text-sm text-muted-foreground">Полные значения — после оплаты</span>
              )}
            </div>
            <div className="mt-4">
              <SetupValues data={owned ? full : preview} locked={!owned} />
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:h-fit">
          <BuyPanel
            setup={{ id: setup.id, title: setup.title, price: setup.price, oldPrice: setup.oldPrice }}
            owned={owned}
            authorized={Boolean(user)}
            providers={providers}
            manualInstructions={payments.manual.instructions}
          />
          <Card className="mt-4 border-border/70 bg-card/70 p-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4 text-[#9d3f38]" /> Что вы получаете
            </div>
            <ul className="mt-3 space-y-1.5">
              <li>• Полные 21 параметр настройки машины</li>
              <li>• Доступ навсегда в личном кабинете</li>
              <li>• Обновление сетапа при патчах игры</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
