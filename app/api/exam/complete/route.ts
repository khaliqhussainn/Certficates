// app/api/exam/complete/route.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { examService } from '@/lib/examService' // ✅ FIXED IMPORT

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, reason, answers } = await request.json()

    // Get exam session with proper includes
    const examSession = await prisma.examSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      },
      include: {
        examAttempt: true // ✅ FIXED: Added proper include
      }
    })

    if (!examSession?.examAttempt) {
      return NextResponse.json({ error: 'Invalid exam session' }, { status: 403 })
    }

    // Complete exam using the examService
    const result = await examService.completeExam(
      examSession.examAttempt.id, 
      reason || 'USER_SUBMIT'
    )

    return NextResponse.json({
      success: true,
      score: result.results.score,
      passed: result.results.passed,
      timeSpent: result.results.timeSpent,
      certificate: result.certificate?.certificateNumber || null,
      reason: result.results.reason
    })

  } catch (error) {
    console.error('Error completing exam:', error)
    return NextResponse.json(
      { error: 'Failed to complete exam' }, 
      { status: 500 }
    )
  }
}