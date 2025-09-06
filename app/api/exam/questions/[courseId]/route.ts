// app/api/exam/questions/[courseId]/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = params
    const sessionId = request.headers.get('X-Exam-Session')

    if (!sessionId) {
      return NextResponse.json({ error: 'Exam session required' }, { status: 400 })
    }

    // Verify exam session
    const examSession = await prisma.examSession.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
        courseId: courseId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    })

    if (!examSession) {
      return NextResponse.json({ error: 'Invalid or expired exam session' }, { status: 403 })
    }

    // Get questions for the course
    const questions = await prisma.examQuestion.findMany({
      where: {
        courseId: courseId,
        isActive: true
      },
      select: {
        id: true,
        question: true,
        options: true,
        order: true,
        difficulty: true
      },
      orderBy: {
        order: 'asc'
      }
    })

    // Shuffle questions if needed
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5)

    return NextResponse.json({
      questions: shuffledQuestions.map((q, index) => ({
        ...q,
        order: index + 1
      }))
    })

  } catch (error) {
    console.error('Error fetching exam questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exam questions' }, 
      { status: 500 }
    )
  }
}