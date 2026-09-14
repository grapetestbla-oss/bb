import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export const SESSION_COOKIE = 'f1icons_session'
const SESSION_TTL_DAYS = 30

export type Role = 'USER' | 'ADMIN' | 'SUPERADMIN'

export type SessionUser = {
  id: string
  username: string
  email: string | null
  displayName: string
  role: Role
  avatar: string | null
  gameNick: string | null
  platform: string | null
  country: string | null
  bio: string | null
  blocked: boolean
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)

  await db.session.create({ data: { token, userId, expiresAt } })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })

  return token
}

export async function destroySession() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await db.session.deleteMany({ where: { token } })
  }
  store.delete(SESSION_COOKIE)
}

/** Текущий пользователь или null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) return null
  if (session.user.blocked) return null

  const u = session.user
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    displayName: u.displayName,
    role: u.role as Role,
    avatar: u.avatar,
    gameNick: u.gameNick,
    platform: u.platform,
    country: u.country,
    bio: u.bio,
    blocked: u.blocked,
  }
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === 'ADMIN' || user?.role === 'SUPERADMIN'
}

export function isSuperAdmin(user: SessionUser | null): boolean {
  return user?.role === 'SUPERADMIN'
}

/** Бросает ошибку-ответ, если пользователь не админ. */
export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!isAdmin(user)) return null
  return user
}
