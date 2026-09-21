"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { SunburstIcon } from "@/components/kp/sunburst-icon";
import { kpApi } from "@/lib/kp/client";
import type { AccountState } from "@/lib/kp/account";

const NAV_LINKS = [
  { href: "#how", label: "Как это работает" },
  { href: "#example", label: "Пример КП" },
  { href: "#pricing", label: "Тарифы" },
  { href: "#faq", label: "Вопросы" },
];

/** Навбар лендинга: фиксированный и полностью прозрачный — лежит поверх видео. */
export function HeroNavbar({ account }: { account: AccountState | null }) {
  const router = useRouter();

  const logout = async () => {
    await kpApi.logout();
    router.refresh();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-transparent px-6 py-4 font-instrument-sans">
      <Link href="/kp" className="flex items-center gap-2 text-white">
        <SunburstIcon />
        <span className="text-sm font-semibold tracking-tight">KPGen</span>
      </Link>

      <div className="hidden items-center gap-8 md:flex">
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            {link.label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-4">
        {account ? (
          <>
            <button
              onClick={logout}
              className="hidden items-center gap-1.5 text-sm font-medium text-white/80 transition-colors hover:text-white sm:flex"
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </button>
            <Link
              href="/kp/app"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-105"
            >
              Мои КП
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/kp/login"
              className="hidden text-sm font-medium text-white/80 transition-colors hover:text-white sm:block"
            >
              Войти
            </Link>
            <Link
              href="/kp/login?mode=register"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform hover:scale-105"
            >
              Начать бесплатно
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
