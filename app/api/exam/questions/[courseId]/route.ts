// app/api/exam/questions/[courseId]/route.ts - FIXED VERSION
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

    // If sessionId is provided, verify exam session
    if (sessionId) {
      const examSession = await prisma.examSession.findFirst({
        where: {
          id: sessionId,
          userId: session.user.id,
          courseId: courseId
        }
      })

      if (!examSession) {
        console.log('Exam session not found or invalid')
        return NextResponse.json({ error: 'Invalid exam session' }, { status: 403 })
      }

      // Update session status to IN_PROGRESS if it's PENDING
      if (examSession.status === 'PENDING') {
        await prisma.examSession.update({
          where: { id: sessionId },
          data: { status: 'IN_PROGRESS', startTime: new Date() }
        })
      }
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Get exam questions for this course
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
        // Note: We don't return correctAnswer for security
      },
      orderBy: {
        order: 'asc'
      }
    })

    // If no questions exist, create some sample questions for testing
    if (questions.length === 0) {
      console.log(`No questions found for course ${courseId}. Creating sample questions...`)
      
      const sampleQuestions = [
        {
          question: "What is the primary purpose of professional certification?",
          options: [
            "To demonstrate knowledge and skills in a specific field",
            "To complete educational requirements only", 
            "To practice basic concepts",
            "To earn academic credits"
          ],
          correctAnswer: 0,
          difficulty: "EASY" as const,
          order: 1
        },
        {
          question: "Which approach best demonstrates professional competency?",
          options: [
            "Memorizing theoretical concepts only",
            "Applying knowledge to solve real-world problems", 
            "Following standard procedures without adaptation",
            "Completing tasks without understanding context"
          ],
          correctAnswer: 1,
          difficulty: "MEDIUM" as const,
          order: 2
        },
        {
          question: "What is the most effective way to maintain professional development?",
          options: [
            "Attending occasional training sessions",
            "Reading industry publications monthly",
            "Continuously learning and adapting to new practices",
            "Following established routines without change"
          ],
          correctAnswer: 2,
          difficulty: "MEDIUM" as const,
          order: 3
        },
        {
          question: "In professional practice, how should you handle ethical dilemmas?",
          options: [
            "Follow personal preferences",
            "Consult established ethical guidelines and principles",
            "Choose the easiest solution",
            "Avoid making difficult decisions"
          ],
          correctAnswer: 1,
          difficulty: "HARD" as const,
          order: 4
        },
        {
          question: "What characterizes effective professional communication?",
          options: [
            "Using complex technical jargon exclusively",
            "Communicating clearly and appropriately for the audience",
            "Avoiding detailed explanations",
            "Speaking only when directly asked"
          ],
          correctAnswer: 1,
          difficulty: "EASY" as const,
          order: 5
        }
      ]

      // Create sample questions in database
      const createdQuestions = await Promise.all(
        sampleQuestions.map(async (q) => {
          return await prisma.examQuestion.create({
            data: {
              courseId: courseId,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              difficulty: q.difficulty,
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
        })
      )

      questions = createdQuestions

      // Update course total questions
      await prisma.course.update({
        where: { id: courseId },
        data: { totalQuestions: questions.length }
      })
    }

    // Shuffle questions for randomization (optional)
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5)

    console.log(`Returning ${shuffledQuestions.length} questions`)

    return NextResponse.json({
      questions: shuffledQuestions.map((q, index) => ({
        ...q,
        order: index + 1
      }))
    })

  } catch (error) {
    console.error('Error fetching exam questions:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch exam questions',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      }, 
      { status: 500 }
    )
  }
}