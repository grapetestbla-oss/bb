import { db } from '@/lib/db'
import { guardAdmin, fail, ok, slugify } from '@/lib/api'

export async function POST(request: Request) {
  const { user, response } = await guardAdmin()
  if (response) return response

  const body = await request.json().catch(() => null)
  const title = String(body?.title ?? '').trim()
  const content = String(body?.content ?? '').trim()
  if (!title) return fail('Укажите заголовок новости')
  if (!content) return fail('Добавьте текст новости')

  let slug = slugify(title)
  if (await db.news.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`

  const item = await db.news.create({
    data: {
      title,
      slug,
      content,
      excerpt: String(body?.excerpt ?? '').trim() || content.slice(0, 180),
      cover: String(body?.cover ?? '').trim() || null,
      published: body?.published !== false,
      pinned: !!body?.pinned,
      authorId: user.id,
    },
  })
  return ok({ news: item }, 201)
}
