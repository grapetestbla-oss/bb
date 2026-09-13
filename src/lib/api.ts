import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/auth'

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data as Record<string, unknown>, init)
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function handleError(error: unknown) {
  if (error instanceof AuthError) return fail(error.message, error.status)
  console.error(error)
  const message = error instanceof Error ? error.message : 'Внутренняя ошибка сервера'
  return fail(message, 500)
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
