import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { PackCard } from '@/components/pack-card'

export const metadata = { title: 'Паки пилотов — FANTASTIQUEBOY SETUPS' }
export const dynamic = 'force-dynamic'

export default async function PacksPage() {
  const user = await getCurrentUser()
  const [pilots, ownedPackIds] = await Promise.all([
    db.pilot.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        packs: {
          where: { active: true },
          include: { pilot: true, _count: { select: { setups: true } } },
          orderBy: [{ featured: 'desc' }, { order: 'asc' }],
        },
      },
    }),
    user
      ? db.order
          .findMany({
            where: { userId: user.id, status: 'paid', packId: { not: null } },
            select: { packId: true },
          })
          .then((rows) => new Set(rows.map((r) => r.packId as string)))
      : Promise.resolve(new Set<string>()),
  ])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="text-center">
        <h1 className="f1-title text-[clamp(1.5rem,4vw,2.4rem)] text-white">Паки пилотов</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-white/55">
          У каждого пилота свой почерк настройки. Пак открывает все его трассы в выбранной игре —
          сухо и дождь на каждой.
        </p>
      </div>

      <div className="mt-12 flex flex-col gap-16">
        {pilots
          .filter((pilot) => pilot.packs.length > 0)
          .map((pilot) => (
            <section key={pilot.id}>
              <div className="text-center">
                <h2 className="f1-title text-lg text-white">{pilot.name}</h2>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/45">{pilot.title}</p>
                {pilot.bio && (
                  <p className="mx-auto mt-3 max-w-xl text-sm text-white/55">{pilot.bio}</p>
                )}
              </div>
              <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
                {pilot.packs.map((pack) => (
                  <PackCard
                    key={pack.id}
                    pack={{
                      ...pack,
                      tracksCount: pack._count.setups,
                      owned: ownedPackIds.has(pack.id),
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  )
}
