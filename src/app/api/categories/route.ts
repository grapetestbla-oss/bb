import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Categories GET error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
