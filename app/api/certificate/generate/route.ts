// app/api/certificate/generate/route.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { examService } from '@/lib/examService'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { examAttemptId } = await request.json()

    // Get the exam attempt with related data
    const examAttempt = await prisma.examAttempt.findUnique({
      where: { id: examAttemptId },
      include: {
        user: true,
        course: true
      }
    })

    if (!examAttempt) {
      return NextResponse.json({ error: 'Exam attempt not found' }, { status: 404 })
    }

    // Check if user owns this exam attempt
    if (examAttempt.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if exam is passed
    if (!examAttempt.passed) {
      return NextResponse.json({ error: 'Certificate can only be generated for passed exams' }, { status: 400 })
    }

    // Determine grade
    let grade = 'F'
    const score = examAttempt.score || 0
    if (score >= 90) grade = 'A'
    else if (score >= 80) grade = 'B'
    else if (score >= 70) grade = 'C'
    else if (score >= 60) grade = 'D'

    // Generate certificate with all required parameters
    const result = await examService.generateCertificate(
      examAttempt.user,
      examAttempt.course,
      examAttempt,
      grade
    )

    return NextResponse.json({ certificate: result })

  } catch (error) {
    console.error('Error generating certificate:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificate' }, 
      { status: 500 }
    )
  }
}
