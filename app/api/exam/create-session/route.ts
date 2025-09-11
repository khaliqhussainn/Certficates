// app/api/exam/create-session/route.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = await request.json()
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    // Check if course exists and is published
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

    // REMOVED: Course completion requirement for testing
    // You can add this back later when you have course completions set up
    /*
    const completion = await prisma.courseCompletion.findFirst({
      where: {
        userId: session.user.id,
        courseId: courseId
      }
    })

    if (!completion) {
      return NextResponse.json({ error: 'Course must be completed before taking exam' }, { status: 403 })
    }
    */

    // Check for existing active session
    const existingSession = await prisma.examSession.findFirst({
      where: {
        userId: session.user.id,
        courseId: courseId,
        status: 'IN_PROGRESS'
      }
    })

    if (existingSession) {
      return NextResponse.json({ 
        session: {
          ...existingSession,
          courseName: course.title
        }
      })
    }

    // Get client IP and user agent
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
      session: {
        id: examSession.id,
        courseId: examSession.courseId,
        courseName: course.title,
        status: examSession.status,
        duration: course.examDuration,
        totalQuestions: course.totalQuestions,
        passingScore: course.passingScore,
        startedAt: examSession.createdAt.toISOString(),
        expiresAt: new Date(Date.now() + (course.examDuration + 10) * 60 * 1000).toISOString(),
        violations: 0
      }
    })

  } catch (error) {
    console.error('Error creating exam session:', error)
    return NextResponse.json(
      { error: 'Failed to create exam session' }, 
      { status: 500 }
    )
  }
}