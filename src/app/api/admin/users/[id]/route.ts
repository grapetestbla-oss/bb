import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { blocked, verified, role, balance, moderatorId } = body

    const existingUser = await db.user.findUnique({ where: { id } })
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (blocked !== undefined) updateData.blocked = blocked
    if (verified !== undefined) updateData.verified = verified
    if (role !== undefined) updateData.role = role
    if (balance !== undefined) updateData.balance = Number(balance)

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatar: true,
        balance: true,
        rating: true,
        reviewsCount: true,
        verified: true,
        blocked: true,
        achievements: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Create moderator log
    if (moderatorId) {
      const changes: string[] = []
      if (blocked !== undefined) changes.push(`blocked: ${blocked}`)
      if (verified !== undefined) changes.push(`verified: ${verified}`)
      if (role !== undefined) changes.push(`role: ${role}`)
      if (balance !== undefined) changes.push(`balance: ${balance}`)

      await db.moderatorLog.create({
        data: {
          moderatorId,
          action: 'update_user',
          target: `user:${existingUser.username}`,
          details: changes.join(', '),
        },
      })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Admin User PATCH error:', error)
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
