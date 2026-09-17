import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleError, ok } from '@/lib/api'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()
    const data: Record<string, unknown> = {}
    for (const key of ['slug', 'name', 'title', 'bio'] as const) {
      if (body[key] !== undefined) data[key] = String(body[key])
    }
    if (body.contact !== undefined) data.contact = body.contact ? String(body.contact) : null
    if (body.order !== undefined) data.order = Number(body.order)
    if (body.active !== undefined) data.active = Boolean(body.active)
    const pilot = await db.pilot.update({ where: { id }, data })
    return ok({ pilot })
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    await requireAdmin()
    const { id } = await params
    await db.pilot.delete({ where: { id } })
    return ok({ success: true })
  } catch (error) {
    return handleError(error)
  }
}
