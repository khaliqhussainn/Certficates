// app/api/exam/start/route.ts
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

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // Update exam session to started
    const examSession = await prisma.examSession.update({
      where: {
        id: sessionId,
        userId: session.user.id
      },
      data: {
        status: 'IN_PROGRESS',
        startTime: new Date()
      }
    })

    // Create exam attempt record
    const examAttempt = await prisma.examAttempt.create({
      data: {
        userId: session.user.id,
        courseId: examSession.courseId,
        sessionId: sessionId,
        startedAt: new Date()
      }
    })

    // Link exam attempt to session
    await prisma.examSession.update({
      where: { id: sessionId },
      data: { examAttemptId: examAttempt.id }
    })

    return NextResponse.json({ 
      success: true,
      examAttemptId: examAttempt.id 
    })

  } catch (error) {
    console.error('Error starting exam:', error)
    return NextResponse.json(
      { error: 'Failed to start exam' }, 
      { status: 500 }
    )
  }
}
