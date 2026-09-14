/** Чистые функции подсчёта очков — используются и на сервере, и в админ-панели. */

export function parsePointsSystem(raw: string): number[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((n) => Number(n) || 0)
  } catch {
    /* ignore */
  }
  return [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
}

/** Очки за гонку по позиции + бонусы, с учётом штрафа. */
export function computeRacePoints(
  opts: {
    position?: number | null
    fastestLap?: boolean
    pole?: boolean
    dnf?: boolean
    penalty?: number
  },
  season: { pointsSystem: string; fastestLapPoint: number; polePoint: number },
) {
  const penalty = opts.penalty ?? 0
  if (opts.dnf) return -penalty
  const table = parsePointsSystem(season.pointsSystem)
  const pos = opts.position ?? 0
  let points = pos > 0 && pos <= table.length ? table[pos - 1] : 0
  if (opts.fastestLap) points += season.fastestLapPoint
  if (opts.pole) points += season.polePoint
  points -= penalty
  return points
}
