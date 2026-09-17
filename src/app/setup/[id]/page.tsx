import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { parseJson } from '@/lib/api'
import { ownsSetup } from '@/lib/ownership'
import { availableProviders } from '@/lib/payments'
import { getPaymentSettings } from '@/lib/settings'
import { BuyPanel } from '@/components/buy-panel'
import { SetupVariants } from '@/components/setup-variants'
import { conditionLabel, packLabel, type SetupData } from '@/lib/f1-data'

export const dynamic = 'force-dynamic'

export default async function SetupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [setup, user] = await Promise.all([
    db.setup.findUnique({
      where: { id },
      include: { track: true, pilot: true, variants: { orderBy: { order: 'asc' } } },
    }),
    getCurrentUser(),
  ])
  if (!setup || (!setup.active && user?.role !== 'admin')) notFound()

  const owned = user?.role === 'admin' || (await ownsSetup(user?.id, setup.id))
  const [providers, payments] = await Promise.all([availableProviders(), getPaymentSettings()])

  const packs = await db.pack.findMany({
    where: { active: true, pilotId: setup.pilotId, setups: { some: { setupId: setup.id } } },
    include: { pilot: true, _count: { select: { setups: true } } },
    take: 2,
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link href="/catalog" className="f1-eyebrow text-white/50 transition-colors hover:text-white">
        ← Назад в каталог
      </Link>

      <div className="mt-8 text-center">
        <p className="f1-eyebrow text-white/45">
          {packLabel(setup.pack)} · {setup.track.country}
          {setup.track.round > 0 ? ` · этап ${setup.track.round}` : ''}
        </p>
        <h1 className="f1-title mt-4 text-[clamp(1.4rem,3.6vw,2.6rem)] text-white">
          {setup.track.flag} {setup.track.name}
        </h1>
        <p className="mt-3 text-white/60">
          Пилот · {setup.pilot.name}
          {setup.pilot.title ? ` — ${setup.pilot.title}` : ''}
        </p>
        <p className="mt-2 text-sm text-white/45">
          В комплекте: {setup.variants.map((v) => v.title || conditionLabel(v.condition)).join(' · ')}
          {setup.track.laps > 0 ? ` · ${setup.track.laps} кругов · ${setup.track.lengthKm.toFixed(3)} км` : ''}
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="whitespace-pre-line text-white/70">{setup.description}</p>

          <div className="mt-10">
            <h2 className="f1-title text-lg text-white">Параметры машины</h2>
            <div className="mt-5">
              <SetupVariants
                owned={owned}
                preview={parseJson<Partial<SetupData>>(setup.previewData, {})}
                variants={setup.variants.map((variant) => ({
                  id: variant.id,
                  condition: variant.condition,
                  title: variant.title,
                  notes: variant.notes,
                  data: owned ? parseJson<Partial<SetupData>>(variant.data, {}) : null,
                }))}
              />
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-40 lg:h-fit">
          <BuyPanel
            kind="setup"
            item={{ id: setup.id, title: setup.track.name, price: setup.price, oldPrice: setup.oldPrice }}
            owned={owned}
            authorized={Boolean(user)}
            providers={providers}
            manualInstructions={payments.manual.instructions}
          />

          {packs.length > 0 && !owned && (
            <div className="mt-6 border border-white/10 p-5 text-sm">
              <p className="f1-eyebrow text-white/45">Дешевле в паке</p>
              {packs.map((pack) => (
                <Link key={pack.id} href={`/pack/${pack.id}`} className="mt-3 block text-white/75 hover:text-white">
                  {pack.title} — {pack._count.setups} трасс за {pack.price.toFixed(0)} ₽
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
