// app/api/exam/submit-answer/route.ts - FIXED VERSION
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

    const { sessionId, questionId, selectedAnswer, timeSpent = 0 } = await request.json()

    console.log('Submitting answer:', { sessionId, questionId, selectedAnswer })

    // Get exam session and verify it belongs to user
    const examSession = await prisma.examSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    })

    if (!examSession) {
      return NextResponse.json({ error: 'Invalid exam session' }, { status: 403 })
    }

    // Ensure exam session has an exam attempt
    let examAttempt = null
    if (examSession.examAttemptId) {
      examAttempt = await prisma.examAttempt.findUnique({
        where: { id: examSession.examAttemptId }
      })
    }

    // Create exam attempt if it doesn't exist
    if (!examAttempt) {
      examAttempt = await prisma.examAttempt.create({
        data: {
          userId: session.user.id,
          courseId: examSession.courseId,
          sessionId: sessionId,
          startedAt: new Date()
        }
      })

      // Update exam session with attempt ID
      await prisma.examSession.update({
        where: { id: sessionId },
        data: { 
          examAttemptId: examAttempt.id,
          status: 'IN_PROGRESS',
          startTime: examSession.startTime || new Date()
        }
      })
    }

    // Get question to check correct answer
    const question = await prisma.examQuestion.findUnique({
      where: { id: questionId }
    })

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const isCorrect = selectedAnswer === question.correctAnswer

    // Save or update the answer
    const savedAnswer = await prisma.examAnswer.upsert({
      where: {
        examAttemptId_questionId: {
          examAttemptId: examAttempt.id,
          questionId: questionId
        }
      },
      update: {
        selectedAnswer: selectedAnswer,
        isCorrect: isCorrect,
        timeSpent: timeSpent
      },
      create: {
        examAttemptId: examAttempt.id,
        questionId: questionId,
        selectedAnswer: selectedAnswer,
        isCorrect: isCorrect,
        timeSpent: timeSpent
      }
    })

    console.log('Answer saved successfully:', { 
      answerId: savedAnswer.id, 
      isCorrect 
    })

    return NextResponse.json({ 
      success: true,
      answerId: savedAnswer.id,
      // Only return correctness in development mode
      ...(process.env.NODE_ENV === 'development' && { isCorrect })
    })

  } catch (error) {
    console.error('Error submitting answer:', error)
    return NextResponse.json(
      { 
        error: 'Failed to submit answer',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, 
      { status: 500 }
    )
  }
}