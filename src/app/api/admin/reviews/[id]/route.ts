import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const review = await db.review.findUnique({ where: { id } })
    if (!review) {
      return NextResponse.json(
        { error: 'Отзыв не найден' },
        { status: 404 }
      )
    }

    await db.review.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Review DELETE error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
