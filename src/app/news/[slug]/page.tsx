import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const item = await db.news.findUnique({ where: { slug } })
  return { title: item?.title ?? 'Новость' }
}

export default async function NewsItemPage({ params }: Props) {
  const { slug } = await params
  const item = await db.news.findUnique({
    where: { slug },
    include: { author: { select: { displayName: true } } },
  })

  if (!item || !item.published) notFound()

  const others = await db.news.findMany({
    where: { published: true, NOT: { id: item.id } },
    orderBy: { createdAt: 'desc' },
    take: 4,
  })

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/news">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Все новости
        </Link>
      </Button>

      <div className="text-xs uppercase tracking-widest text-primary">{formatDateTime(item.createdAt)}</div>
      <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{item.title}</h1>
      {item.author && <div className="mt-3 text-sm text-muted-foreground">Автор: {item.author.displayName}</div>}

      {item.cover && (
         
        <img src={item.cover} alt={item.title} className="mt-6 w-full rounded-xl border border-border object-cover" />
      )}

      <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-foreground/90">
        {item.content.split(/\n{2,}/).map((paragraph, i) => (
          <p key={i} className="whitespace-pre-line">{paragraph}</p>
        ))}
      </div>

      {others.length > 0 && (
        <div className="mt-12 border-t border-border pt-8">
          <h2 className="mb-4 text-lg font-bold">Другие новости</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((n) => (
              <Link key={n.id} href={`/news/${n.slug}`} className="surface p-4 transition-colors hover:border-primary/50">
                <div className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</div>
                <div className="mt-1 font-semibold leading-snug">{n.title}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
