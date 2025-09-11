// app/api/exam/results/[sessionId]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId } = params

    // Get exam session with related data - Fixed schema relations
    const examSession = await prisma.examSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    })

    if (!examSession) {
      return NextResponse.json({ error: 'Exam session not found' }, { status: 404 })
    }

    // Get course data separately
    const course = await prisma.course.findUnique({
      where: { id: examSession.courseId },
      select: {
        id: true,
        title: true,
        passingScore: true
      }
    })

    // Get exam attempt if it exists
    let examAttempt = null
    let certificate = null
    let answers: ({ question: { correctAnswer: number } } & { id: string; createdAt: Date; timeSpent: number | null; examAttemptId: string; questionId: string; selectedAnswer: number | null; isCorrect: boolean })[] = []

    if (examSession.examAttemptId) {
      examAttempt = await prisma.examAttempt.findUnique({
        where: { id: examSession.examAttemptId },
        include: {
          answers: {
            include: {
              question: {
                select: {
                  correctAnswer: true
                }
              }
            }
          }
        }
      })

      // Get certificate if it exists
      if (examAttempt) {
        certificate = await prisma.certificate.findUnique({
          where: { examAttemptId: examAttempt.id },
          select: {
            certificateNumber: true,
            verificationCode: true
          }
        })
        answers = examAttempt.answers
      }
    }

    // Calculate results
    const totalQuestions = answers.length
    const correctAnswers = answers.filter(answer => answer.isCorrect).length

    const result = {
      id: examSession.id,
      score: examSession.score || 0,
      passed: examSession.passed || false,
      totalQuestions,
      correctAnswers,
      timeSpent: examAttempt?.timeSpent || 0,
      completedAt: examSession.endTime || examSession.updatedAt,
      course: course,
      certificate: certificate,
      violations: examSession.violations || []
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fetching exam results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exam results' }, 
      { status: 500 }
    )
  }
}
