// app/api/exam/results/[sessionId]/route.ts - FIXED VERSION (no course relation)
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

    // Get the exam session without course relation
    const examSession = await prisma.examSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id
      }
    })

    if (!examSession || !examSession.examAttemptId) {
      return NextResponse.json({ error: 'Exam session not found' }, { status: 404 })
    }

    // Get the exam attempt with all related data
    const examAttempt = await prisma.examAttempt.findUnique({
      where: { id: examSession.examAttemptId },
      include: {
        answers: {
          include: {
            question: true
          },
          orderBy: {
            question: { order: 'asc' }
          }
        },
        certificate: true,
        user: true,
        course: true // This relation exists on ExamAttempt
      }
    })

    if (!examAttempt) {
      return NextResponse.json({ error: 'Exam attempt not found' }, { status: 404 })
    }

    // Get course from examAttempt instead of examSession
    const course = examAttempt.course

    // Calculate results
    const totalQuestions = examAttempt.answers.length
    const correctAnswers = examAttempt.answers.filter(a => a.isCorrect).length
    const score = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
    const passed = score >= course.passingScore

    // Determine grade
    let grade = 'F'
    if (score >= 90) grade = 'A'
    else if (score >= 80) grade = 'B'
    else if (score >= 70) grade = 'C'
    else if (score >= 60) grade = 'D'

    // Prepare question breakdown
    const breakdown = examAttempt.answers.map(answer => ({
      questionId: answer.questionId,
      question: answer.question.question,
      selectedAnswer: answer.selectedAnswer,
      correctAnswer: answer.question.correctAnswer,
      isCorrect: answer.isCorrect,
      options: answer.question.options,
      explanation: answer.question.explanation,
      timeSpent: answer.timeSpent || 0
    }))

    const results = {
      sessionId: examSession.id,
      courseId: course.id,
      courseName: course.title,
      score: score,
      passed: passed,
      totalQuestions: totalQuestions,
      correctAnswers: correctAnswers,
      timeSpent: examAttempt.timeSpent || 0,
      passingScore: course.passingScore,
      grade: grade,
      completedAt: examAttempt.completedAt?.toISOString() || new Date().toISOString(),
      violations: examSession.violations || [],
      certificate: examAttempt.certificate ? {
        id: examAttempt.certificate.id,
        certificateNumber: examAttempt.certificate.certificateNumber,
        verificationCode: examAttempt.certificate.verificationCode,
        pdfPath: examAttempt.certificate.pdfPath,
        issuedAt: examAttempt.certificate.issuedAt.toISOString()
      } : null
    }

    return NextResponse.json({
      results,
      breakdown
    })

  } catch (error) {
    console.error('Error fetching exam results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exam results' }, 
      { status: 500 }
    )
  }
}