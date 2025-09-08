// app/api/exam/heartbeat/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = await request.json()

    // Update session heartbeat
    await prisma.examSession.update({
      where: {
        id: sessionId,
        userId: session.user.id
      },
      data: {
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating heartbeat:', error)
    return NextResponse.json(
      { error: 'Failed to update heartbeat' }, 
      { status: 500 }
    )
  }
}
