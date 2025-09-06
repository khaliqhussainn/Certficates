// app/api/exam/complete/route.ts
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

    const { sessionId, reason, answers } = await request.json()

    // Get exam session and course info
    const examSession = await prisma.examSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      },
      include: {
        examAttempt: {
          include: {
            answers: {
              include: {
                question: true
              }
            }
          }
        }
      }
    })

    if (!examSession?.examAttempt) {
      return NextResponse.json({ error: 'Invalid exam session' }, { status: 403 })
    }

    const course = await prisma.course.findUnique({
      where: { id: examSession.courseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Calculate score
    const totalQuestions = examSession.examAttempt.answers.length
    const correctAnswers = examSession.examAttempt.answers.filter(a => a.isCorrect).length
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
    const passed = score >= course.passingScore

    // Calculate time spent
    const startTime = examSession.startTime || examSession.createdAt
    const timeSpent = Math.round((Date.now() - startTime.getTime()) / 1000 / 60) // minutes

    // Update exam attempt
    await prisma.examAttempt.update({
      where: { id: examSession.examAttempt.id },
      data: {
        score: score,
        passed: passed,
        completedAt: new Date(),
        timeSpent: timeSpent
      }
    })

    // Update exam session
    await prisma.examSession.update({
      where: { id: sessionId },
      data: {
        status: reason === 'SECURITY_VIOLATION' ? 'TERMINATED' : 'COMPLETED',
        endTime: new Date(),
        score: score,
        passed: passed
      }
    })

    // Generate certificate if passed
    let certificate = null
    if (passed && reason !== 'SECURITY_VIOLATION') {
      const certificateNumber = `CERT-${course.id.toUpperCase()}-${Date.now()}`
      
      certificate = await prisma.certificate.create({
        data: {
          userId: session.user.id,
          courseId: examSession.courseId,
          examAttemptId: examSession.examAttempt.id,
          certificateNumber: certificateNumber,
          score: score,
          grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D',
          verificationCode: `VER-${certificateNumber}`
        }
      })
    }

    return NextResponse.json({
      success: true,
      score: score,
      passed: passed,
      timeSpent: timeSpent,
      certificate: certificate?.certificateNumber || null,
      reason: reason
    })

  } catch (error) {
    console.error('Error completing exam:', error)
    return NextResponse.json(
      { error: 'Failed to complete exam' }, 
      { status: 500 }
    )
  }
}