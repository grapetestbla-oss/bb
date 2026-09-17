import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ownsPack } from '@/lib/ownership'
import { availableProviders } from '@/lib/payments'
import { getPaymentSettings } from '@/lib/settings'
import { BuyPanel } from '@/components/buy-panel'
import { gameLabel } from '@/lib/f1-data'

export const dynamic = 'force-dynamic'

export default async function PackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [pack, user] = await Promise.all([
    db.pack.findUnique({
      where: { id },
      include: {
        pilot: true,
        setups: {
          include: { setup: { include: { track: true, variants: true } } },
        },
      },
    }),
    getCurrentUser(),
  ])
  if (!pack || (!pack.active && user?.role !== 'admin')) notFound()

  const owned = user?.role === 'admin' || (await ownsPack(user?.id, pack.id))
  const [providers, payments] = await Promise.all([availableProviders(), getPaymentSettings()])

  const items = pack.setups
    .map((item) => item.setup)
    .sort((a, b) => a.track.round - b.track.round)

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link href="/packs" className="f1-eyebrow text-white/50 transition-colors hover:text-white">
        ← Все паки
      </Link>

      <div className="mt-8 text-center">
        <p className="f1-eyebrow text-white/45">{gameLabel(pack.game)} · пак пилота</p>
        <h1 className="f1-title mt-4 text-[clamp(1.4rem,3.6vw,2.6rem)] text-white">{pack.title}</h1>
        <p className="mt-3 text-white/60">
          {pack.pilot.name}
          {pack.pilot.title ? ` — ${pack.pilot.title}` : ''}
        </p>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <p className="whitespace-pre-line text-white/70">{pack.description}</p>
          {pack.pilot.bio && <p className="mt-4 text-sm text-white/50">{pack.pilot.bio}</p>}

          <h2 className="f1-title mt-10 text-lg text-white">Что входит · {items.length} трасс</h2>
          <div className="mt-5 border border-white/10">
            {items.map((setup) => (
              <Link
                key={setup.id}
                href={`/setup/${setup.id}`}
                className="flex items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-3 text-sm last:border-b-0 hover:bg-white/[0.04]"
              >
                <span className="flex items-center gap-3">
                  <span className="text-lg leading-none">{setup.track.flag}</span>
                  <span className="text-white/85">{setup.track.name}</span>
                </span>
                <span className="f1-eyebrow text-white/40">
                  {setup.variants.length} варианта
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-40 lg:h-fit">
          <BuyPanel
            kind="pack"
            item={{ id: pack.id, title: pack.title, price: pack.price, oldPrice: pack.oldPrice }}
            owned={owned}
            authorized={Boolean(user)}
            providers={providers}
            manualInstructions={payments.manual.instructions}
          />
          <p className="mt-4 text-center text-xs text-white/40">
            Покупка пака открывает все сетапы внутри — по отдельности они стоили бы{' '}
            {(pack.oldPrice ?? 0).toFixed(0)} ₽
          </p>
        </div>
      </div>
    </div>
  )
}
