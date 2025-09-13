// 2. app/api/courses/[courseId]/route.ts - COMPLETE FILE WITHOUT PAYMENT REQUIREMENT

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courseId = params.courseId

    // First try to get from course website
    const courseWebsiteUrl = process.env.COURSE_WEBSITE_URL
    const apiKey = process.env.COURSE_WEBSITE_API_KEY

    let course = null

    if (courseWebsiteUrl && apiKey) {
      try {
        const response = await fetch(`${courseWebsiteUrl}/api/courses/${courseId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          }
        })

        if (response.ok) {
          const data = await response.json()
          course = data.course || data
        }
      } catch (fetchError) {
        console.error('Error fetching course from website:', fetchError)
      }
    }

    // Fallback to local database
    if (!course) {
      course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          examQuestions: {
            select: {
              id: true,
              difficulty: true,
              order: true
            }
          }
        }
      })
    }

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check if user has completed this course (optional info)
    const completion = await prisma.courseCompletion.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId
        }
      }
    })

    // Check if user has existing certificate
    const certificate = await prisma.certificate.findFirst({
      where: {
        userId: session.user.id,
        courseId: courseId,
        isRevoked: false
      }
    })

    // REMOVED: Payment check - no longer required for exam access

    // Get user's exam attempts for this course
    const examAttempts = await prisma.examAttempt.findMany({
      where: {
        userId: session.user.id,
        courseId: courseId
      },
      orderBy: { startedAt: 'desc' },
      take: 5
    })

    return NextResponse.json({
      course,
      completion,
      certificate,
      payment: { status: 'FREE_ACCESS', amount: 0 }, // Mock payment object for compatibility
      examAttempts,
      // UPDATED: Can take exam without payment (only blocked if already has certificate)
      canTakeExam: !certificate,
      totalQuestions: course.examQuestions?.length || 10,
      // Additional info
      courseCompletionOptional: true,
      examAccessRequirements: {
        payment: false, // No payment required
        courseCompletion: false, // Not required
        certificate: !certificate
      },
      freeAccess: true // Indicate this is free access
    })

  } catch (error) {
    console.error('Error fetching course details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course details' },
      { status: 500 }
    )
  }
}