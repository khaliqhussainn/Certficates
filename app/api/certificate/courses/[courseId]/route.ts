import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { NextRequest, NextResponse } from "next/server"

// app/api/certificate/course/[courseId]/route.ts - Individual Course Details
export async function GET(
  req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { courseId } = params

    // Get course details
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        description: true,
        thumbnail: true,
        category: true,
        level: true,
        certificatePrice: true,
        certificateDiscount: true,
        certificateEnabled: true,
        passingScore: true,
        examDuration: true,
        totalQuestions: true,
        rating: true,
        prerequisites: true,
        tags: true
      }
    })

    if (!course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      )
    }

    if (!course.certificateEnabled) {
      return NextResponse.json(
        { error: 'Certificate not available for this course' },
        { status: 400 }
      )
    }

    // Check if user has completed this course
    const completion = await prisma.courseCompletion.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId
        }
      }
    })

    // Check if user already has an application
    const existingApplication = await prisma.examApplication.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId
        }
      }
    })

    return NextResponse.json({
      ...course,
      isCompleted: !!completion,
      completedAt: completion?.completedAt,
      hasApplication: !!existingApplication,
      applicationStatus: existingApplication?.status
    })

  } catch (error) {
    console.error('Error fetching course:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}