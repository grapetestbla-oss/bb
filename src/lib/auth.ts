import crypto from 'crypto'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

const SECRET = process.env.AUTH_SECRET || 'f1-setups-dev-secret-change-me'
export const SESSION_COOKIE = 'f1_session'

export type SessionUser = {
  id: string
  login: string
  email: string
  role: string
  contact: string | null
}

function sign(value: string) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url')
}

export function createToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({ id: userId, iat: Date.now() })
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function readToken(token: string | undefined): string | null {
  if (!token || !token.includes('.')) return null
  const [payload, signature] = token.split('.')
  if (sign(payload) !== signature) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (!data?.id) return null
    // срок жизни сессии — 30 дней
    if (Date.now() - (data.iat || 0) > 30 * 24 * 60 * 60 * 1000) return null
    return data.id as string
  } catch {
    return null
  }
}

export async function setSessionCookie(userId: string) {
  const store = await cookies()
  store.set(SESSION_COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const userId = readToken(store.get(SESSION_COOKIE)?.value)
  if (!userId) return null
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return null
  return {
    id: user.id,
    login: user.login,
    email: user.email,
    role: user.role,
    contact: user.contact,
  }
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new AuthError('Требуется авторизация', 401)
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== 'admin') throw new AuthError('Доступ только для администратора', 403)
  return user
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  if (hash.startsWith('$2')) return bcrypt.compare(password, hash)
  return password === hash
}
