// app/api/exam/create-session/route.ts - Updated to check payment
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId } = body

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Check if user has paid for this course
    const payment = await prisma.payment.findFirst({
      where: {
        userId: session.user.id,
        courseId,
        status: 'COMPLETED'
      }
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment required to access this exam' },
        { status: 403 }
      )
    }

    // Get course details
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        examDuration: true,
        totalQuestions: true,
        passingScore: true
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check for existing active session
    const existingSession = await prisma.examSession.findFirst({
      where: {
        userId: session.user.id,
        courseId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    })

    if (existingSession) {
      return NextResponse.json({
        success: true,
        session: {
          id: existingSession.id,
          courseId: existingSession.courseId,
          courseName: course.title,
          status: existingSession.status,
          startedAt: existingSession.startTime,
          expiresAt: existingSession.endTime,
          violations: 0,
          duration: course.examDuration,
          totalQuestions: course.totalQuestions,
          passingScore: course.passingScore
        }
      })
    }

    // Create new exam session
    const examSession = await prisma.examSession.create({
      data: {
        userId: session.user.id,
        courseId,
        status: 'PENDING',
        timeRemaining: course.examDuration,
        browserFingerprint: request.headers.get('user-agent') || '',
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        isMonitored: true
      }
    })

    return NextResponse.json({
      success: true,
      session: {
        id: examSession.id,
        courseId: examSession.courseId,
        courseName: course.title,
        status: examSession.status,
        startedAt: examSession.startTime,
        expiresAt: examSession.endTime,
        violations: 0,
        duration: course.examDuration,
        totalQuestions: course.totalQuestions,
        passingScore: course.passingScore
      }
    })

  } catch (error) {
    console.error('Exam session creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create exam session' },
      { status: 500 }
    )
  }
}
