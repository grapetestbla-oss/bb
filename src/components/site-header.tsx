'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Menu, Shield, LogOut, User as UserIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/lib/auth'

const NAV = [
  { href: '/', label: 'Главная' },
  { href: '/news', label: 'Новости' },
  { href: '/calendar', label: 'Календарь' },
  { href: '/standings', label: 'Зачёт' },
  { href: '/teams', label: 'Команды' },
  { href: '/apply', label: 'Заявка в лигу' },
]

export function SiteHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN'

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-3" onClick={() => setOpen(false)}>
          <Image
            src="/logo.jpg"
            alt="F1 Icons League"
            width={40}
            height={40}
            priority
            className="h-10 w-10 rounded-lg object-cover ring-1 ring-primary/40"
          />
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-black tracking-widest text-gradient-gold">F1 ICONS</span>
            <span className="text-[10px] font-semibold tracking-[0.3em] text-muted-foreground">LEAGUE</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isAdmin && (
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/admin">
                <Shield className="mr-1.5 h-4 w-4" /> Админ-панель
              </Link>
            </Button>
          )}
          {user ? (
            <>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/cabinet">
                  <UserIcon className="mr-1.5 h-4 w-4" />
                  {user.displayName}
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} title="Выйти" className="hidden sm:inline-flex">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Войти</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Регистрация</Link>
              </Button>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Меню"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col p-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'rounded-md px-3 py-2.5 text-sm font-medium',
                  isActive(item.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
                )}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
              {user ? (
                <>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/cabinet" onClick={() => setOpen(false)}>Личный кабинет</Link>
                  </Button>
                  {isAdmin && (
                    <Button asChild variant="outline" size="sm">
                      <Link href="/admin" onClick={() => setOpen(false)}>Админ-панель</Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={logout}>Выйти</Button>
                </>
              ) : (
                <>
                  <Button asChild variant="secondary" size="sm">
                    <Link href="/login" onClick={() => setOpen(false)}>Войти</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/register" onClick={() => setOpen(false)}>Регистрация</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
