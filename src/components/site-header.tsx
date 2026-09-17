'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, LogOut, Menu, Search, Shield, User as UserIcon, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/lib/auth'
import { SOCIAL_LABELS, type SocialLinks } from '@/lib/socials'

const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/catalog', label: 'Сетапы F1 25' },
  { href: '/catalog?pack=s2026', label: '2026 Season Pack' },
  { href: '/training', label: 'Обучение' },
]

export function SiteHeader({
  user,
  socials,
}: {
  user: SessionUser | null
  socials: SocialLinks
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!user) return
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => setUnread(d.unread || 0))
      .catch(() => undefined)
  }, [user, pathname])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-black">
      {/* Верхняя служебная строка */}
      <div className="hidden border-b border-white/10 md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 text-[11px] uppercase tracking-[0.18em] text-white/55">
          <nav className="flex gap-5">
            {SOCIAL_LABELS.filter(({ key }) => socials[key]).map(({ key, label }) => (
              <a
                key={key}
                href={socials[key]}
                target="_blank"
                rel="noreferrer noopener"
                className="transition-colors hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
          <span>Россия (RUB ₽)</span>
        </div>
      </div>

      {/* Логотип и иконки */}
      <div className="relative mx-auto flex h-16 max-w-7xl items-center px-4">
        <button
          type="button"
          className="hidden text-white/80 transition-colors hover:text-white md:block"
          aria-label="Поиск"
          onClick={() => router.push('/catalog')}
        >
          <Search className="h-5 w-5" />
        </button>

        <button
          type="button"
          className="text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link
          href="/"
          className="f1-title absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[15px] text-white sm:text-xl"
        >
          Fantastiqueboy Set Ups
        </Link>

        <div className="ml-auto flex items-center gap-4 text-white/80">
          {user ? (
            <>
              {user.role === 'admin' && (
                <Link href="/admin" aria-label="Панель управления" className="transition-colors hover:text-white">
                  <Shield className="h-5 w-5" />
                </Link>
              )}
              <Link href="/profile" aria-label="Уведомления" className="relative transition-colors hover:text-white">
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <Badge className="absolute -right-2 -top-2 h-4 min-w-4 justify-center bg-[#e3242b] px-1 text-[10px] text-white">
                    {unread}
                  </Badge>
                )}
              </Link>
              <Link href="/profile" aria-label="Личный кабинет" className="transition-colors hover:text-white">
                <UserIcon className="h-5 w-5" />
              </Link>
              <button type="button" onClick={logout} aria-label="Выйти" className="transition-colors hover:text-white">
                <LogOut className="h-5 w-5" />
              </button>
            </>
          ) : (
            <Link href="/login" aria-label="Вход" className="transition-colors hover:text-white">
              <UserIcon className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Навигация */}
      <nav className="hidden justify-center gap-8 pb-4 md:flex">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'f1-title text-sm transition-colors lg:text-base',
              pathname === item.href.split('?')[0] ? 'text-white' : 'text-white/70 hover:text-white'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Полоса-анонс */}
      <div className="announce">
        <p className="f1-eyebrow mx-auto max-w-7xl px-4 py-2 text-center">
          Сетапы F1 25 и 2026 Season Pack — собраны и проверены в лигах
        </p>
      </div>

      {open && (
        <div className="border-b border-white/10 bg-black md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="f1-title py-2 text-sm text-white/80"
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-white/10" />
            {user ? (
              <>
                <Link href="/profile" onClick={() => setOpen(false)} className="py-2 text-sm text-white/80">
                  Личный кабинет ({user.login})
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="py-2 text-sm text-white/80">
                    Панель управления
                  </Link>
                )}
                <button onClick={logout} className="py-2 text-left text-sm text-white/80">
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="py-2 text-sm text-white/80">
                  Вход
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="py-2 text-sm text-white/80">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
