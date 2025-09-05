// app/api/certificate/courses/route.ts - Course Synchronization
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's completed courses if they have any
    const userCompletions = await prisma.courseCompletion.findMany({
      where: { userId: session.user.id },
      select: { courseId: true, completedAt: true }
    })

    const completedCourseIds = new Set(userCompletions.map((c: { courseId: any }) => c.courseId))

    // Fetch all courses with certificate enabled
    const courses = await prisma.course.findMany({
      where: { 
        isPublished: true,
        certificateEnabled: true 
      },
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
        rating: true
      },
      orderBy: [
        { isFeatured: 'desc' },
        { rating: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Add completion status to courses
    const coursesWithStatus = courses.map((course: { id: unknown }) => ({
      ...course,
      isCompleted: completedCourseIds.has(course.id),
      completedAt: userCompletions.find((c: { courseId: any }) => c.courseId === course.id)?.completedAt
    }))

    return NextResponse.json(coursesWithStatus)

  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
