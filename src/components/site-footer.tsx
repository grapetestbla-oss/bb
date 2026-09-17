import Link from 'next/link'
import { SOCIAL_LABELS, type SocialLinks } from '@/lib/socials'

const PAYMENTS = ['Visa', 'Mastercard', 'МИР', 'СБП', 'ЮMoney', 'FreeKassa', 'Platega']

export function SiteFooter({ socials }: { socials: SocialLinks }) {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto max-w-3xl px-4 py-14 text-center">
        <h2 className="f1-title text-xl text-white">Рассылка</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/60">
          Новые сетапы к каждому этапу и обновления после патчей игры.
        </p>
        <form className="mx-auto mt-6 flex max-w-md items-center gap-0 border-b border-white/30 pb-1">
          <input
            id="newsletter-email"
            type="email"
            placeholder="Ваш email"
            className="flex-1 bg-transparent px-1 py-2 text-sm text-white outline-none placeholder:text-white/40"
          />
          <button type="submit" className="f1-eyebrow px-3 py-2 text-white/80 transition-colors hover:text-white">
            Подписаться
          </button>
        </form>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-10">
          <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {[
              { href: '/catalog', label: 'Каталог сетапов' },
              { href: '/training', label: 'Обучение' },
              { href: '/profile', label: 'Мои покупки' },
              { href: '/login', label: 'Вход' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="f1-eyebrow text-white/70 transition-colors hover:text-white">
                {item.label}
              </Link>
            ))}
          </nav>

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {SOCIAL_LABELS.filter(({ key }) => socials[key]).map(({ key, label }) => (
              <a
                key={key}
                href={socials[key]}
                target="_blank"
                rel="noreferrer noopener"
                className="f1-eyebrow text-white/50 transition-colors hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex flex-wrap justify-center gap-2">
            {PAYMENTS.map((method) => (
              <span
                key={method}
                className="border border-white/15 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/50"
              >
                {method}
              </span>
            ))}
          </div>

          <p className="max-w-xl text-center text-xs leading-relaxed text-white/40">
            © {new Date().getFullYear()} Fantastiqueboy Set Ups. Сайт не связан с Formula 1, FIA и EA SPORTS.
            Все товарные знаки принадлежат их владельцам.
          </p>
        </div>
      </div>
    </footer>
  )
}
