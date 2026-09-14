import type { DriverStanding, TeamStanding } from '@/lib/standings'

export type AdminSeason = {
  id: string
  name: string
  slug: string
  status: string
  isCurrent: boolean
  description: string | null
  rules: string | null
  pointsSystem: string
  fastestLapPoint: number
  polePoint: number
  applicationsOpen: boolean
  startDate: string | null
}

export type AdminTeam = {
  id: string
  seasonId: string
  name: string
  shortName: string | null
  color: string
  logo: string | null
  pointsAdjust: number
  order: number
}

export type AdminEntry = {
  id: string
  seasonId: string
  userId: string
  teamId: string | null
  number: number | null
  status: string
  pointsAdjust: number
  user: { id: string; username: string; displayName: string; avatar: string | null }
  team: { id: string; name: string; color: string } | null
}

export type AdminResult = {
  id: string
  raceId: string
  entryId: string
  position: number | null
  points: number
  fastestLap: boolean
  pole: boolean
  dnf: boolean
  penalty: number
  note: string | null
}

export type AdminRace = {
  id: string
  seasonId: string
  round: number
  name: string
  track: string
  country: string | null
  flag: string | null
  date: string
  laps: number | null
  status: string
  broadcastUrl: string | null
  notes: string | null
  results: AdminResult[]
}

export type AdminApplication = {
  id: string
  userId: string
  seasonId: string | null
  gameNick: string
  platform: string
  psnId: string | null
  age: number | null
  experience: string | null
  availability: string | null
  about: string | null
  preferredTeam: string | null
  status: string
  adminComment: string | null
  createdAt: string
  reviewedAt: string | null
  user: { id: string; username: string; displayName: string; email: string | null; avatar: string | null }
  season: { id: string; name: string } | null
  reviewer: { username: string; displayName: string } | null
}

export type AdminNews = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
  cover: string | null
  published: boolean
  pinned: boolean
  createdAt: string
}

export type AdminUser = {
  id: string
  username: string
  displayName: string
  email: string | null
  role: string
  blocked: boolean
  avatar: string | null
  gameNick: string | null
  platform: string | null
  createdAt: string
}

export type AdminOverview = {
  seasons: AdminSeason[]
  season: AdminSeason | null
  teams: AdminTeam[]
  entries: AdminEntry[]
  races: AdminRace[]
  standings: { drivers: DriverStanding[]; teams: TeamStanding[]; racesTotal: number } | null
  applications: AdminApplication[]
  news: AdminNews[]
  users: AdminUser[]
}

/** Обёртка над fetch с разбором ошибок API. */
export async function api<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? 'Ошибка запроса')
  return data as T
}
