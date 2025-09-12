// app/api/exam/session/[sessionId]/start/route.ts - Fixed exam start API
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = params
    const body = await request.json().catch(() => ({}))
    const { browserData } = body

    console.log('Starting exam session:', sessionId)

    // Check if exam session exists and belongs to user
    const examSession = await prisma.examSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    })

    if (!examSession) {
      return NextResponse.json({ error: 'Invalid or expired exam session' }, { status: 403 })
    }

    // Update exam session to started
    const updatedSession = await prisma.examSession.update({
      where: {
        id: sessionId
      },
      data: {
        status: 'IN_PROGRESS',
        startTime: new Date(),
        // Store browser data for security validation
        browserFingerprint: browserData?.userAgent 
          ? Buffer.from(browserData.userAgent).toString('base64')
          : examSession.browserFingerprint
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

    console.log('Exam started successfully:', {
      sessionId,
      attemptId: examAttempt.id,
      status: updatedSession.status
    })

    return NextResponse.json({ 
      success: true,
      examAttemptId: examAttempt.id,
      sessionId: sessionId,
      status: updatedSession.status,
      startedAt: updatedSession.startTime
    })

  } catch (error) {
    console.error('Error starting exam:', error)
    return NextResponse.json(
      { error: 'Failed to start exam' }, 
      { status: 500 }
    )
  }
}