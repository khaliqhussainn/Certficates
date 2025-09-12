// app/api/exam/session/[courseId]/route.ts - Fixed exam session API
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

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

    // Check if course exists
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        isPublished: true,
        certificateEnabled: true
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found or not available for certification' }, { status: 404 })
    }

    // Look for existing active session
    const existingSession = await prisma.examSession.findFirst({
      where: {
        userId: session.user.id,
        courseId: courseId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    })

    if (existingSession) {
      return NextResponse.json({
        id: existingSession.id,
        courseId: existingSession.courseId,
        courseName: course.title,
        status: existingSession.status,
        duration: course.examDuration,
        totalQuestions: course.totalQuestions,
        passingScore: course.passingScore,
        startedAt: existingSession.startTime?.toISOString() || existingSession.createdAt.toISOString(),
        expiresAt: new Date(Date.now() + (course.examDuration + 10) * 60 * 1000).toISOString(),
        violations: Array.isArray(existingSession.violations) ? existingSession.violations.length : 0,
        allowedAttempts: 3,
        currentAttempt: 1
      })
    }

    // Get client info for security
    const headersList = headers()
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Create new exam session
    const examSession = await prisma.examSession.create({
      data: {
        userId: session.user.id,
        courseId: courseId,
        status: 'PENDING',
        timeRemaining: course.examDuration,
        ipAddress: ipAddress,
        browserFingerprint: Buffer.from(userAgent).toString('base64'),
        isMonitored: true
      }
    })

    return NextResponse.json({
      id: examSession.id,
      courseId: examSession.courseId,
      courseName: course.title,
      status: examSession.status,
      duration: course.examDuration,
      totalQuestions: course.totalQuestions,
      passingScore: course.passingScore,
      startedAt: examSession.createdAt.toISOString(),
      expiresAt: new Date(Date.now() + (course.examDuration + 10) * 60 * 1000).toISOString(),
      violations: 0,
      allowedAttempts: 3,
      currentAttempt: 1
    })

  } catch (error) {
    console.error('Error in exam session API:', error)
    return NextResponse.json(
      { error: 'Failed to get exam session' }, 
      { status: 500 }
    )
  }
}