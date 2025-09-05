// Certificate Platform: app/api/courses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { courseIntegration } from '@/lib/courseIntegration'

// GET /api/courses - Get all available courses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get courses from local database
    const localCourses = await prisma.course.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' }
    })

    // Sync courses from main website if integration is available
    try {
      await courseIntegration.syncCoursesFromCourseWebsite()
      
      // Refetch after sync
      const updatedCourses = await prisma.course.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' }
      })

      return NextResponse.json({ courses: updatedCourses })
    } catch (syncError) {
      console.log('Course sync failed, using local courses:', syncError)
      return NextResponse.json({ courses: localCourses })
    }

  } catch (error) {
    console.error('Error fetching courses:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    )
  }
}
