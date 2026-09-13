import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/70 bg-[#0b0b0f]">
      <div className="h-1 checkered opacity-70" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-6 w-1.5 rounded-sm bg-[#e10600]" />
            <span className="f1-title text-lg">
              APEX<span className="text-[#e10600]">SETUPS</span>
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Сетапы для F1 25 и 2026 Season Pack на все трассы игры. Проверены в лигах и тайм-триале.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide">Разделы</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/catalog" className="hover:text-[#e10600]">Каталог сетапов</Link></li>
            <li><Link href="/training" className="hover:text-[#e10600]">Обучение</Link></li>
            <li><Link href="/profile" className="hover:text-[#e10600]">Мои покупки</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide">Важно</h4>
          <p className="text-sm text-muted-foreground">
            Сайт не связан с Formula 1, FIA и EA SPORTS. Все товарные знаки принадлежат их владельцам.
          </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} APEX SETUPS. Все права защищены.
      </div>
    </footer>
  )
}
