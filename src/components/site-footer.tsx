import Link from 'next/link'
import Image from 'next/image'

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="F1 Icons League" width={44} height={44} className="h-11 w-11 rounded-lg object-cover ring-1 ring-primary/40" />
            <div className="leading-tight">
              <div className="text-sm font-black tracking-widest text-gradient-gold">F1 ICONS</div>
              <div className="text-[10px] font-semibold tracking-[0.3em] text-muted-foreground">LEAGUE</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Киберспортивная лига по F1 25. Честные гонки, живые трансляции и настоящая борьба за титул.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Лига</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/news" className="hover:text-primary">Новости</Link></li>
            <li><Link href="/calendar" className="hover:text-primary">Календарь сезона</Link></li>
            <li><Link href="/standings" className="hover:text-primary">Таблица зачёта</Link></li>
            <li><Link href="/teams" className="hover:text-primary">Команды и пилоты</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Участникам</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link href="/apply" className="hover:text-primary">Подать заявку</Link></li>
            <li><Link href="/cabinet" className="hover:text-primary">Личный кабинет</Link></li>
            <li><Link href="/rules" className="hover:text-primary">Регламент</Link></li>
            <li><Link href="/register" className="hover:text-primary">Регистрация</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Формат</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Игра: F1 25</li>
            <li>Заезды по расписанию сезона</li>
            <li>Личный и командный зачёт</li>
            <li>Судейство и разбор инцидентов</li>
          </ul>
        </div>
      </div>

      <div className="checkered h-1.5 w-full opacity-70" />
      <div className="mx-auto max-w-7xl px-4 py-5 text-xs text-muted-foreground">
        © {new Date().getFullYear()} F1 Icons League. Фан-проект, не связан с Formula 1 и EA Sports.
      </div>
    </footer>
  )
}
