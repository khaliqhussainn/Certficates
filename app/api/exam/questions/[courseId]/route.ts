// app/api/exam/questions/[courseId]/route.ts - Fixed exam questions API
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
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')

    console.log('Fetching questions for course:', courseId, 'session:', sessionId)

    // Verify exam session if sessionId provided
    if (sessionId) {
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
    }

    // Get questions for the course
    let questions = await prisma.examQuestion.findMany({
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
        // Note: We don't select correctAnswer for security
      },
      orderBy: {
        order: 'asc'
      }
    })

    // If no questions exist in database, create some sample questions
    if (questions.length === 0) {
      console.log('No questions found, creating sample questions for course:', courseId)
      
      const sampleQuestions = [
        {
          question: "What is the primary purpose of this certification?",
          options: ["To demonstrate knowledge", "To complete requirements", "To practice skills", "To earn credits"],
          correctAnswer: 0,
          difficulty: "EASY",
          order: 1
        },
        {
          question: "Which of the following best describes professional standards?",
          options: ["Optional guidelines", "Mandatory requirements", "Industry best practices", "Personal preferences"],
          correctAnswer: 2,
          difficulty: "MEDIUM",
          order: 2
        },
        {
          question: "How should you approach complex problem-solving?",
          options: ["Use trial and error", "Apply systematic analysis", "Rely on intuition", "Copy existing solutions"],
          correctAnswer: 1,
          difficulty: "MEDIUM",
          order: 3
        },
        {
          question: "What is the most important aspect of continuous learning?",
          options: ["Memorizing facts", "Understanding concepts", "Following procedures", "Completing tasks"],
          correctAnswer: 1,
          difficulty: "HARD",
          order: 4
        },
        {
          question: "Which approach leads to better outcomes?",
          options: ["Individual effort", "Team collaboration", "Manager direction", "Expert consultation"],
          correctAnswer: 1,
          difficulty: "MEDIUM",
          order: 5
        }
      ]

      // Create sample questions
      const createdQuestions = await Promise.all(
        sampleQuestions.map(q => 
          prisma.examQuestion.create({
            data: {
              courseId: courseId,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              difficulty: q.difficulty as any,
              order: q.order,
              isActive: true
            },
            select: {
              id: true,
              question: true,
              options: true,
              order: true,
              difficulty: true
            }
          })
        )
      )

      questions = createdQuestions
    }

    // Shuffle questions for randomization
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