import Link from 'next/link'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/format'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Новости' }

export default async function NewsPage() {
  const news = await db.news.findMany({
    where: { published: true },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    include: { author: { select: { displayName: true } } },
  })

  return (
    <div>
      <PageHeader
        eyebrow="F1 Icons League"
        title="Новости лиги"
        subtitle="Анонсы этапов, итоги гонок, решения судейской коллегии и объявления администрации."
      />

      <div className="mx-auto max-w-7xl px-4 py-10">
        {news.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
              <Link
                key={item.id}
                href={`/news/${item.slug}`}
                className="surface group flex flex-col overflow-hidden transition-colors hover:border-primary/50"
              >
                {item.cover ? (
                   
                  <img src={item.cover} alt={item.title} className="h-44 w-full object-cover" />
                ) : (
                  <div className="hero-grid h-44 w-full" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(item.createdAt)}</span>
                    {item.pinned && <Badge variant="outline" className="border-primary/40 text-primary">Закреплено</Badge>}
                  </div>
                  <h2 className="mt-2 text-lg font-bold leading-snug group-hover:text-primary">{item.title}</h2>
                  <p className="mt-2 line-clamp-4 flex-1 text-sm text-muted-foreground">{item.excerpt}</p>
                  {item.author && (
                    <div className="mt-4 text-xs text-muted-foreground">Автор: {item.author.displayName}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Новостей пока нет" description="Как только администрация опубликует первую новость, она появится здесь." />
        )}
      </div>
    </div>
  )
}
