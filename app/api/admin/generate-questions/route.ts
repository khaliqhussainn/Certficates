// app/api/admin/generate-questions/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { questionGenerator } from '@/lib/openaiQuestionGenerator'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      courseId, 
      courseTitle, 
      courseDescription, 
      courseLevel, 
      numberOfQuestions, 
      difficulty 
    } = await request.json()

    await questionGenerator.generateAndSaveQuestions(courseId, {
      courseTitle,
      courseDescription,
      courseLevel,
      numberOfQuestions,
      difficulty
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error generating questions:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' }, 
      { status: 500 }
    )
  }
}