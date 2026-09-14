import { NextResponse } from 'next/server'
import { getCurrentUser, isAdmin, isSuperAdmin, type SessionUser } from '@/lib/auth'

export function ok<T>(data: T, init?: number) {
  return NextResponse.json(data as object, { status: init ?? 200 })
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

type Guarded = { user: SessionUser; response?: never } | { user?: never; response: NextResponse }

export async function guardUser(): Promise<Guarded> {
  const user = await getCurrentUser()
  if (!user) return { response: fail('Требуется авторизация', 401) }
  return { user }
}

export async function guardAdmin(): Promise<Guarded> {
  const user = await getCurrentUser()
  if (!user) return { response: fail('Требуется авторизация', 401) }
  if (!isAdmin(user)) return { response: fail('Недостаточно прав', 403) }
  return { user }
}

export async function guardSuperAdmin(): Promise<Guarded> {
  const user = await getCurrentUser()
  if (!user) return { response: fail('Требуется авторизация', 401) }
  if (!isSuperAdmin(user)) return { response: fail('Доступно только главному администратору', 403) }
  return { user }
}

export function slugify(input: string) {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya',
  }
  const base = input
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || `post-${Date.now().toString(36)}`
}
