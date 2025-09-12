// app/api/exam/session/route.ts - COMPLETELY FIXED VERSION
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/exam/session - Starting request processing')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('Unauthorized: No user session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get courseId from query parameters
    const url = new URL(request.url)
    const courseId = url.searchParams.get('courseId')
    
    if (!courseId) {
      console.log('Missing courseId parameter')
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 })
    }

    console.log('Processing exam session for:', { userId: session.user.id, courseId })

    // Verify course exists and is published
    const course = await prisma.course.findFirst({
      where: { 
        id: courseId,
        isPublished: true
      }
    })

    if (!course) {
      console.log('Course not found or not published:', courseId)
      return NextResponse.json({ error: 'Course not found or not available' }, { status: 404 })
    }

    console.log('Found course:', course.title)

    // Check for existing active session
    let examSession = await prisma.examSession.findFirst({
      where: {
        userId: session.user.id,
        courseId: courseId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    })

    if (examSession) {
      console.log('Found existing session:', examSession.id)
      
      // Return existing session
      const response = {
        id: examSession.id,
        courseId: examSession.courseId,
        courseName: course.title,
        status: examSession.status,
        duration: course.examDuration || 120,
        totalQuestions: course.totalQuestions || 5,
        passingScore: course.passingScore || 70,
        startedAt: (examSession.startTime || examSession.createdAt).toISOString(),
        expiresAt: new Date(Date.now() + ((course.examDuration || 120) + 10) * 60 * 1000).toISOString(),
        violations: Array.isArray(examSession.violations) ? examSession.violations.length : 0,
        allowedAttempts: 3,
        currentAttempt: 1
      }

      console.log('Returning existing session')
      return NextResponse.json(response)
    }

    console.log('Creating new exam session')
    
    // Get client info for security
    const headersList = headers()
    const ipAddress = headersList.get('x-forwarded-for') || 
                      headersList.get('x-real-ip') || 
                      headersList.get('remote-addr') || 
                      'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Create new exam session
    examSession = await prisma.examSession.create({
      data: {
        userId: session.user.id,
        courseId: courseId,
        status: 'PENDING',
        timeRemaining: course.examDuration || 120,
        ipAddress: ipAddress,
        browserFingerprint: Buffer.from(userAgent).toString('base64').substring(0, 100), // Limit length
        isMonitored: false, // Disable monitoring for now to avoid SEB issues
        violations: []
      }
    })

    console.log('Created new session:', examSession.id)

    // Return success response
    const response = {
      id: examSession.id,
      courseId: examSession.courseId,
      courseName: course.title,
      status: examSession.status,
      duration: course.examDuration || 120,
      totalQuestions: course.totalQuestions || 5,
      passingScore: course.passingScore || 70,
      startedAt: examSession.createdAt.toISOString(),
      expiresAt: new Date(Date.now() + ((course.examDuration || 120) + 10) * 60 * 1000).toISOString(),
      violations: 0,
      allowedAttempts: 3,
      currentAttempt: 1
    }

    console.log('SUCCESS: Returning new session for course:', courseId)
    return NextResponse.json(response)

  } catch (error) {
    console.error('CRITICAL ERROR in exam session API:', error)
    
    // Return detailed error in development
    const errorResponse = {
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Handle POST same as GET for backward compatibility
  return GET(request)
}