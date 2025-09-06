// app/api/exam/submit-answer/route.ts
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

    const { sessionId, questionId, selectedAnswer, timeSpent } = await request.json()

    // Get exam session and attempt
    const examSession = await prisma.examSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        status: 'IN_PROGRESS'
      },
      include: {
        examAttempt: true
      }
    })

    if (!examSession?.examAttempt) {
      return NextResponse.json({ error: 'Invalid exam session' }, { status: 403 })
    }

    // Get question to check correct answer
    const question = await prisma.examQuestion.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const isCorrect = selectedAnswer === question.correctAnswer

    // Upsert answer (update if exists, create if not)
    await prisma.examAnswer.upsert({
      where: {
        examAttemptId_questionId: {
          examAttemptId: examSession.examAttempt.id,
          questionId: questionId
        }
      },
      update: {
        selectedAnswer: selectedAnswer,
        isCorrect: isCorrect,
        timeSpent: timeSpent
      },
      create: {
        examAttemptId: examSession.examAttempt.id,
        questionId: questionId,
        selectedAnswer: selectedAnswer,
        isCorrect: isCorrect,
        timeSpent: timeSpent
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error submitting answer:', error)
    return NextResponse.json(
      { error: 'Failed to submit answer' }, 
      { status: 500 }
    )
  }
}
