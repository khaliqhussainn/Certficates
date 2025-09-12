// Create: app/api/exam/session/route.ts (simple single route)
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/exam/session - Processing request')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get courseId from query parameters
    const url = new URL(request.url)
    const courseId = url.searchParams.get('courseId')
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    console.log('Processing for course:', courseId)

    // Get course (NO SEB CHECKS)
    const course = await prisma.course.findFirst({
      where: { id: courseId }
    })

    if (!course) {
      console.log('Course not found:', courseId)
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    console.log('Found course:', course.title)

    // Check for existing session
    let examSession = await prisma.examSession.findFirst({
      where: {
        userId: session.user.id,
        courseId: courseId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    })

    if (!examSession) {
      console.log('Creating new exam session')
      
      // Get client info
      const headersList = headers()
      const ipAddress = headersList.get('x-forwarded-for') || 'unknown'
      const userAgent = headersList.get('user-agent') || 'unknown'

      // Create session - NO SEB REQUIREMENTS
      examSession = await prisma.examSession.create({
        data: {
          userId: session.user.id,
          courseId: courseId,
          status: 'PENDING',
          timeRemaining: course.examDuration || 120,
          ipAddress: ipAddress,
          browserFingerprint: Buffer.from(userAgent).toString('base64'),
          isMonitored: false // Disable to avoid SEB requirements
        }
      })
      
      console.log('Created session:', examSession.id)
    }

    // Return success response
    const response = {
      id: examSession.id,
      courseId: examSession.courseId,
      courseName: course.title,
      status: examSession.status,
      duration: course.examDuration || 120,
      totalQuestions: course.totalQuestions || 15,
      passingScore: course.passingScore || 70,
      startedAt: (examSession.startTime || examSession.createdAt).toISOString(),
      expiresAt: new Date(Date.now() + ((course.examDuration || 120) + 10) * 60 * 1000).toISOString(),
      violations: 0,
      allowedAttempts: 3,
      currentAttempt: 1
    }

    console.log('SUCCESS: Returning session for course:', courseId)
    return NextResponse.json(response)

  } catch (error) {
    console.error('ERROR in exam session API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return GET(request) // Handle POST same as GET for now
}