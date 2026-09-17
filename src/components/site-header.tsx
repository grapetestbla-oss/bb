'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, LogOut, Menu, Shield, User as UserIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/lib/auth'

const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/catalog', label: 'Каталог сетапов' },
  { href: '/training', label: 'Обучение' },
]

export function SiteHeader({ user }: { user: SessionUser | null }) {
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
    <header className="sticky top-0 z-50 border-b border-border/70 bg-[#0d0e10]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="h-7 w-1.5 rounded-sm bg-[#9d3f38]" />
          <span className="f1-title text-xl tracking-tight">
            FANTASTIQUEBOY<span className="text-[#9d3f38]"> SETUPS</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'px-3 py-2 text-sm font-medium uppercase tracking-wide transition-colors',
                pathname === item.href
                  ? 'text-[#9d3f38]'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden md:flex items-center gap-2">
          {user ? (
            <>
              {user.role === 'admin' && (
                <Button asChild variant="outline" size="sm" className="border-[#9d3f38]/60 text-[#c98a82]">
                  <Link href="/admin">
                    <Shield className="mr-1.5 h-4 w-4" /> Панель
                  </Link>
                </Button>
              )}
              <Button asChild variant="ghost" size="sm" className="relative">
                <Link href="/profile">
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center bg-[#9d3f38] px-1 text-[10px]">
                      {unread}
                    </Badge>
                  )}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/profile">
                  <UserIcon className="mr-1.5 h-4 w-4" />
                  {user.login}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={logout} aria-label="Выйти">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Вход</Link>
              </Button>
              <Button asChild size="sm" className="bg-[#9d3f38] hover:bg-[#b34d44]">
                <Link href="/register">Регистрация</Link>
              </Button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="ml-auto md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div className="border-t border-border/70 bg-[#0d0e10] md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded px-3 py-2 text-sm font-medium uppercase hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            {user ? (
              <>
                <Link href="/profile" onClick={() => setOpen(false)} className="rounded px-3 py-2 text-sm hover:bg-white/5">
                  Профиль ({user.login})
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin" onClick={() => setOpen(false)} className="rounded px-3 py-2 text-sm text-[#c98a82] hover:bg-white/5">
                    Панель администратора
                  </Link>
                )}
                <button onClick={logout} className="rounded px-3 py-2 text-left text-sm hover:bg-white/5">
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className="rounded px-3 py-2 text-sm hover:bg-white/5">
                  Вход
                </Link>
                <Link href="/register" onClick={() => setOpen(false)} className="rounded px-3 py-2 text-sm text-[#9d3f38] hover:bg-white/5">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      )}
      <div className="h-px speed-lines" />
    </header>
  )
}
