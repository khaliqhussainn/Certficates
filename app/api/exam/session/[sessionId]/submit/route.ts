// app/api/exam/session/[sessionId]/submit/route.ts - Submit Complete Exam
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = params

    // Get exam session with all related data
    const examSession = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        course: true,
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

    if (!examSession) {
      return NextResponse.json({ error: 'Exam session not found' }, { status: 404 })
    }

    if (examSession.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 })
    }

    if (!examSession.examAttempt) {
      return NextResponse.json({ error: 'No exam attempt found' }, { status: 400 })
    }

    if (examSession.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Exam already completed' }, { status: 400 })
    }

    // Calculate results
    const totalQuestions = examSession.examAttempt.answers.length
    const correctAnswers = examSession.examAttempt.answers.filter(a => a.isCorrect).length
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
    const passed = score >= examSession.course.passingScore

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
        status: 'COMPLETED',
        endTime: new Date(),
        score: score,
        passed: passed
      }
    })

    // Generate certificate if passed
    let certificateNumber = null
    if (passed) {
      const certificate = await prisma.certificate.create({
        data: {
          userId: session.user.id,
          courseId: examSession.courseId,
          examAttemptId: examSession.examAttempt.id,
          certificateNumber: `CERT-${examSession.courseId.substring(0, 8)}-${Date.now()}`,
          score: score,
          grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D',
          verificationCode: `VER-${Date.now()}`
        }
      })
      certificateNumber = certificate.certificateNumber
    }

    return NextResponse.json({
      score: correctAnswers,
      totalQuestions: totalQuestions,
      percentage: Math.round(score),
      passed: passed,
      timeSpent: timeSpent,
      certificateNumber: certificateNumber
    })

  } catch (error) {
    console.error('Error submitting exam:', error)
    return NextResponse.json(
      { error: 'Failed to submit exam' }, 
      { status: 500 }
    )
  }
}