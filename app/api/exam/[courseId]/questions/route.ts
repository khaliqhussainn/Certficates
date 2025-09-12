// app/api/exam/[courseId]/questions/route.ts - Get Exam Questions
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = params

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Get exam questions for this course
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
        // Note: We don't return correctAnswer or explanation for security
      },
      orderBy: {
        order: 'asc'
      }
    })

    if (questions.length === 0) {
      // If no questions exist, create some sample questions for testing
      console.log(`No questions found for course ${courseId}. You may need to seed questions.`)
      
      // Return empty array for now - in production, this should be handled properly
      return NextResponse.json([])
    }

    // Shuffle questions for security (optional)
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5)

    // Map to frontend format
    const formattedQuestions = shuffledQuestions.map((question, index) => ({
      id: question.id,
      question: question.question,
      options: question.options,
      // Don't include correctAnswer for security
      order: index + 1,
      difficulty: question.difficulty
    }))

    return NextResponse.json(formattedQuestions)

  } catch (error) {
    console.error('Error fetching exam questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exam questions' }, 
      { status: 500 }
    )
  }
}