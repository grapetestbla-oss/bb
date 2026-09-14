import { db } from '@/lib/db'
import { guardAdmin, fail, ok } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  const { response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body) return fail('Некорректный запрос')

  const data: Record<string, unknown> = {}
  if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim()
  if (typeof body.content === 'string' && body.content.trim()) data.content = body.content.trim()
  if (typeof body.excerpt === 'string') data.excerpt = body.excerpt.trim() || null
  if (typeof body.cover === 'string') data.cover = body.cover.trim() || null
  if (typeof body.published === 'boolean') data.published = body.published
  if (typeof body.pinned === 'boolean') data.pinned = body.pinned

  const item = await db.news.update({ where: { id }, data })
  return ok({ news: item })
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { response } = await guardAdmin()
  if (response) return response

  const { id } = await params
  await db.news.delete({ where: { id } })
  return ok({ success: true })
}
