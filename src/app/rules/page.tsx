import { getCurrentSeason, parsePointsSystem } from '@/lib/standings'
import { PageHeader } from '@/components/page-header'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Регламент' }

const DEFAULT_RULES = `Все участники обязаны соблюдать чистоту гонки и уважительно общаться в эфире и чатах лиги.
Контакт, повлёкший преимущество, наказывается штрафом по решению судейской коллегии.
Опоздание на квалификацию допускает старт с конца пелотона.
Пропуск двух этапов подряд без предупреждения — исключение из состава команды.
Все инциденты разбираются по записям с обеих сторон в течение 48 часов после гонки.`

export default async function RulesPage() {
  const season = await getCurrentSeason()
  const points = season ? parsePointsSystem(season.pointsSystem) : []
  const rules = season?.rules?.trim() || DEFAULT_RULES

  return (
    <div>
      <PageHeader
        eyebrow={season?.name ?? 'F1 Icons League'}
        title="Регламент лиги"
        subtitle="Правила проведения этапов, система начисления очков и дисциплинарные нормы."
      />

      <div className="mx-auto max-w-4xl px-4 py-10">
        {season && (
          <div className="surface mb-8 p-6">
            <h2 className="text-lg font-bold">Система начисления очков</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {points.map((p, i) => (
                <div key={i} className="flex min-w-[64px] flex-col items-center rounded-lg border border-border bg-muted/40 px-3 py-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{i + 1} место</span>
                  <span className="text-lg font-black tabular-nums text-primary">{p}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div>Быстрый круг: <span className="font-semibold text-foreground">+{season.fastestLapPoint}</span></div>
              <div>Поул-позиция: <span className="font-semibold text-foreground">+{season.polePoint}</span></div>
            </div>
          </div>
        )}

        <div className="surface space-y-4 p-6 text-[15px] leading-relaxed text-foreground/90">
          {rules.split(/\n+/).map((line, i) => (
            <p key={i} className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{line}</span>
            </p>
          ))}
        </div>

        {season?.description && (
          <div className="surface mt-6 p-6">
            <h2 className="text-lg font-bold">О сезоне</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{season.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
